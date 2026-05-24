export type RenderClosure = () => MemoChild;
export type MemoChild = Node | string | number | boolean | null | undefined | RenderClosure | readonly unknown[];
type EventHandler = (event: Event) => void;
export type MemoProps = Record<string, unknown> | null | undefined;
type EventWrapper = (handler: EventHandler) => EventListener;
type ComponentType = (props: Record<string, unknown>) => MemoChild | RenderClosure;
type MemoElement = HTMLElement & {
  __memoKey?: unknown;
  __memoProps?: Record<string, unknown>;
  __memoListeners?: Map<string, EventListener>;
};
type ComponentInstance = {
  type: ComponentType;
  key: unknown;
  props: Record<string, unknown>;
  render: RenderClosure;
};
type RenderState = {
  instances: Map<string, ComponentInstance>;
  seen: Set<string>;
  stack: string[];
  counters: number[];
};

let activeEventWrapper: EventWrapper | null = null;
let activeRenderState: RenderState | null = null;

export type MemoDeps = readonly unknown[];

export interface MemoContext<TModel> {
  readonly model: TModel;
  el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: MemoProps,
    ...children: MemoChild[]
  ): HTMLElementTagNameMap[K];
  invalidate(): void;
  event(handler: (event: Event, model: TModel) => void): EventListener;
  memo(key: string | number, deps: MemoDeps, render: () => MemoChild): Node;
}

export interface MemoApp<TModel> {
  readonly model?: TModel;
  readonly root: Element;
  render(): void;
  destroy(): void;
}

type MemoEntry = {
  deps: MemoDeps;
  node: Node;
};

function sameDeps(a: MemoDeps, b: MemoDeps): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function toNode(child: unknown): Node {
  if (child instanceof Node) return child;

  if (isRenderClosure(child)) {
    return toNode(child());
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    for (const item of child.flat(Infinity)) {
      if (item === null || item === undefined || item === false || item === true) continue;
      fragment.appendChild(toNode(item));
    }
    return fragment;
  }

  return document.createTextNode(child == null || typeof child === 'boolean' ? '' : String(child));
}

function isRenderClosure(value: unknown): value is RenderClosure {
  return typeof value === 'function';
}

function componentLabel(type: ComponentType): string {
  return type.name || 'Anonymous';
}

function createComponentId(type: ComponentType, props: MemoProps): string | null {
  if (!activeRenderState) return null;

  const depth = activeRenderState.stack.length;
  const slot = activeRenderState.counters[depth] ?? 0;
  activeRenderState.counters[depth] = slot + 1;
  const key = props && 'key' in props ? props.key : slot;
  return `${activeRenderState.stack.join('/')}/${componentLabel(type)}:${String(key)}`;
}

function runInComponent<T>(id: string, render: () => T): T {
  if (!activeRenderState) return render();

  activeRenderState.stack.push(id);
  activeRenderState.counters[activeRenderState.stack.length] = 0;
  try {
    return render();
  } finally {
    activeRenderState.stack.pop();
  }
}

function updateProps(target: Record<string, unknown>, next: Record<string, unknown>) {
  for (const key of Object.keys(target)) {
    if (!(key in next)) delete target[key];
  }

  for (const [key, value] of Object.entries(next)) {
    target[key] = value;
  }
}

function createComponentClosure(
  type: ComponentType,
  props: MemoProps,
  children: MemoChild[],
): RenderClosure {
  const nextProps = { ...(props ?? {}), children };
  const id = createComponentId(type, props);

  if (!id || !activeRenderState) {
    const output = type(nextProps);
    return isRenderClosure(output) ? output : () => output;
  }

  return () => {
    const state = activeRenderState;
    if (!state) {
      const output = type(nextProps);
      return isRenderClosure(output) ? output() : output;
    }

    let instance = state.instances.get(id);
    if (!instance || instance.type !== type) {
      const stableProps = { ...nextProps };
      const output = type(stableProps);
      instance = {
        type,
        key: props && 'key' in props ? props.key : undefined,
        props: stableProps,
        render: isRenderClosure(output) ? output : () => output,
      };
      state.instances.set(id, instance);
    } else {
      updateProps(instance.props, nextProps);
    }

    state.seen.add(id);
    return runInComponent(id, instance.render);
  };
}

function isElement(node: Node): node is MemoElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

function getKey(node: Node): unknown {
  return isElement(node) ? node.__memoKey : undefined;
}

function eventNameForProp(key: string): string | null {
  return key.startsWith('on') && key.length > 2 ? key.slice(2).toLowerCase() : null;
}

function setProp(
  element: MemoElement,
  key: string,
  value: unknown,
  oldValue: unknown,
  wrapEvent: (handler: EventHandler) => EventListener
) {
  if (Object.is(value, oldValue)) return;

  if (key === 'ref' && typeof value === 'function') {
    (value as (el: HTMLElement) => void)(element);
    return;
  }

  if (key === 'className' || key === 'class') {
    element.className = value == null ? '' : String(value);
    return;
  }

  if (key === 'style' && value && typeof value === 'object') {
    Object.assign(element.style, value);
    return;
  }

  const eventName = eventNameForProp(key);
  if (eventName) {
    const listeners = element.__memoListeners ??= new Map();
    const previous = listeners.get(key);
    if (previous) {
      element.removeEventListener(eventName, previous);
      listeners.delete(key);
    }

    if (typeof value === 'function') {
      const listener = wrapEvent(value as EventHandler);
      listeners.set(key, listener);
      element.addEventListener(eventName, listener);
    }
    return;
  }

  if (value === false || value === null || value === undefined) {
    if (key in element) {
      try {
        (element as any)[key] = typeof oldValue === 'boolean' ? false : '';
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    element.removeAttribute(key);
    return;
  }

  if (value === true) {
    element.setAttribute(key, '');
    return;
  }

  if (key in element) {
    try {
      (element as any)[key] = value;
      return;
    } catch {
      // Fall through to attribute assignment for readonly DOM properties.
    }
  }

  element.setAttribute(key, String(value));
}

function setProps(
  element: MemoElement,
  nextProps: Record<string, unknown>,
  wrapEvent: EventWrapper,
) {
  const previousProps = element.__memoProps ?? {};
  const propNames = new Set([...Object.keys(previousProps), ...Object.keys(nextProps)]);

  for (const key of propNames) {
    if (key === 'children' || key === 'key') continue;
    setProp(element, key, nextProps[key], previousProps[key], wrapEvent);
  }

  element.__memoProps = { ...nextProps };
}

function canPatch(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;
  if (current.nodeType === Node.TEXT_NODE) return true;
  if (!isElement(current) || !isElement(next)) return false;
  return current.tagName === next.tagName && Object.is(getKey(current), getKey(next));
}

function patchNode(parent: Node, current: Node, next: Node): Node {
  if (!canPatch(current, next)) {
    parent.replaceChild(next, current);
    return next;
  }

  if (current.nodeType === Node.TEXT_NODE) {
    if (current.textContent !== next.textContent) {
      current.textContent = next.textContent;
    }
    return current;
  }

  const currentElement = current as MemoElement;
  const nextElement = next as MemoElement;
  setProps(currentElement, nextElement.__memoProps ?? {}, activeEventWrapper ?? ((handler) => handler));
  currentElement.__memoKey = nextElement.__memoKey;
  patchChildren(currentElement, Array.from(nextElement.childNodes));
  return currentElement;
}

function patchChildren(parent: Node, nextChildren: Node[]) {
  const oldChildren = Array.from(parent.childNodes);
  const keyedOld = new Map<unknown, Node>();
  const usedOld = new Set<Node>();

  for (const child of oldChildren) {
    const key = getKey(child);
    if (key !== undefined) keyedOld.set(key, child);
  }

  for (let index = 0; index < nextChildren.length; index++) {
    const next = nextChildren[index]!;
    const key = getKey(next);
    const currentAtIndex = parent.childNodes[index] ?? null;
    let match = key !== undefined ? keyedOld.get(key) : oldChildren[index];

    if (match && usedOld.has(match)) match = undefined;

    const patched = match ? patchNode(parent, match, next) : next;
    usedOld.add(patched);

    if (patched !== currentAtIndex) {
      parent.insertBefore(patched, currentAtIndex);
    }
  }

  for (const child of oldChildren) {
    if (!usedOld.has(child) && child.parentNode === parent) {
      child.remove();
    }
  }
}

function patchRoot(root: Element, next: Node) {
  const nextChildren = next instanceof DocumentFragment ? Array.from(next.childNodes) : [next];
  patchChildren(root, nextChildren);
}

export function createMemoElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: MemoProps,
  children: MemoChild[],
  wrapEvent: EventWrapper = activeEventWrapper ?? ((handler) => handler)
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag) as MemoElement;
  const appliedProps: Record<string, unknown> = {};

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue;
      if (key === 'key') {
        element.__memoKey = value;
        continue;
      }

      appliedProps[key] = value;
      setProp(element, key, value, undefined, wrapEvent);
    }
  }

  element.__memoProps = appliedProps;

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    element.appendChild(toNode(child));
  }

  return element as HTMLElementTagNameMap[K];
}

/**
 * Creates an event-invalidated DOM app.
 *
 * App state can be an ordinary mutable object. Event handlers mutate that object,
 * then the runtime schedules one rerender in a microtask. Expensive or stable
 * subtrees can be wrapped with ctx.memo(key, deps, render) to reuse their DOM
 * nodes while the rest of the view is rebuilt.
 */
export function createMemoApp(
  root: Element,
  app: MemoChild | RenderClosure
): MemoApp<never>;
export function createMemoApp<TModel>(
  root: Element,
  model: TModel,
  view: (ctx: MemoContext<TModel>) => MemoChild
): MemoApp<TModel>;
export function createMemoApp<TModel>(
  root: Element,
  modelOrApp: TModel | MemoChild | RenderClosure,
  view?: (ctx: MemoContext<TModel>) => MemoChild
): MemoApp<TModel> {
  const cache = new Map<string | number, MemoEntry>();
  const componentInstances = new Map<string, ComponentInstance>();
  let scheduled = false;
  let destroyed = false;
  const model = view ? modelOrApp as TModel : undefined;
  const app = view ? null : modelOrApp as MemoChild | RenderClosure;

  const renderNow = () => {
    if (destroyed) return;
    scheduled = false;
    const previousWrapper = activeEventWrapper;
    const previousRenderState = activeRenderState;
    const renderState: RenderState = {
      instances: componentInstances,
      seen: new Set(),
      stack: ['root'],
      counters: [0],
    };
    activeEventWrapper = (handler) => ctx.event((event) => handler(event));
    activeRenderState = renderState;
    try {
      const output = view ? view(ctx) : isRenderClosure(app) ? app() : app;
      patchRoot(root, toNode(output));
      for (const id of componentInstances.keys()) {
        if (!renderState.seen.has(id)) componentInstances.delete(id);
      }
    } finally {
      activeEventWrapper = previousWrapper;
      activeRenderState = previousRenderState;
    }
  };

  const invalidate = () => {
    if (destroyed || scheduled) return;
    scheduled = true;
    queueMicrotask(renderNow);
  };

  const ctx: MemoContext<TModel> = {
    model: model as TModel,
    el(tag, props, ...children) {
      return createMemoElement(tag, props, children, (handler) => ctx.event((event) => handler(event)));
    },
    invalidate,
    event(handler) {
      return (event) => {
        handler(event, model as TModel);
        invalidate();
      };
    },
    memo(key, deps, render) {
      const cached = cache.get(key);
      if (cached && sameDeps(cached.deps, deps)) {
        return cached.node;
      }

      const node = toNode(render());
      cache.set(key, { deps: [...deps], node });
      return node;
    },
  };

  renderNow();

  return {
    ...(view ? { model: model as TModel } : {}),
    root,
    render: renderNow,
    destroy() {
      destroyed = true;
      scheduled = false;
      cache.clear();
      componentInstances.clear();
      root.replaceChildren();
    },
  };
}

export function h<K extends keyof HTMLElementTagNameMap>(
  type: K,
  props?: MemoProps,
  ...children: MemoChild[]
): HTMLElementTagNameMap[K];
export function h<P extends Record<string, unknown>>(
  type: (props: P & { children?: MemoChild | MemoChild[] }) => MemoChild | RenderClosure,
  props?: P | null,
  ...children: MemoChild[]
): Node | RenderClosure;
export function h(type: any, props?: MemoProps, ...children: MemoChild[]): Node | RenderClosure {
  if (typeof type === 'function') {
    return createComponentClosure(type, props, children);
  }

  return createMemoElement(type, props, children);
}

export function Fragment(props: { children?: MemoChild | MemoChild[] } = {}): DocumentFragment {
  return toNode(Array.isArray(props.children) ? props.children : [props.children]) as DocumentFragment;
}
