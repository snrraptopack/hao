export type RenderClosure = () => MemoChild;
export type MemoChild = Node | string | number | boolean | null | undefined | RenderClosure | TemplateNode | readonly unknown[];
type EventHandler = (event: Event) => unknown;
export type MemoProps = Record<string, unknown> | null | undefined;
type EventWrapper = (handler: EventHandler) => EventListener;
type ComponentType = (props: Record<string, unknown>) => MemoChild | RenderClosure;
type MemoElement = HTMLElement & {
  __memoKey?: unknown;
  __memoProps?: Record<string, unknown>;
  __memoListeners?: Map<string, EventListener>;
  __memoTemplate?: TemplateNode;
};
type TemplateNode = {
  __auwlaTemplate: true;
  tag: keyof HTMLElementTagNameMap;
  props: Record<string, unknown>;
  children: MemoChild[];
  key: unknown;
};
type ComponentInstance = {
  type: ComponentType;
  key: unknown;
  props: Record<string, unknown>;
  render: RenderClosure;
};
type RenderState = {
  instances: Map<string, ComponentInstance>;
  memos: Map<string, MemoBlock>;
  seen: Set<string>;
  stack: string[];
  counters: number[];
};
type MemoBlock = {
  deps: readonly unknown[];
  value: MemoChild;
};

const NO_INDEX = -1;

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
  event(handler: (event: Event, model: TModel) => unknown): EventListener;
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

  if (isTemplateNode(child)) {
    return createNodeFromTemplate(child);
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

function isTemplateNode(value: unknown): value is TemplateNode {
  return !!value && typeof value === 'object' && (value as TemplateNode).__auwlaTemplate === true;
}

function objectShallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a).filter((key) => key !== 'children');
  const bKeys = Object.keys(b).filter((key) => key !== 'children');
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!(key in b)) return false;
    const av = a[key];
    const bv = b[key];
    if (key === 'style' && av && bv && typeof av === 'object' && typeof bv === 'object') {
      if (!objectShallowEqual(av as Record<string, unknown>, bv as Record<string, unknown>)) return false;
      continue;
    }
    if (!Object.is(av, bv)) return false;
  }

  return true;
}

function templateEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!isTemplateNode(a) || !isTemplateNode(b)) return false;
  if (a.tag !== b.tag || !Object.is(a.key, b.key)) return false;
  if (!objectShallowEqual(a.props, b.props)) return false;

  const aChildren = normalizeChildren(a.children);
  const bChildren = normalizeChildren(b.children);
  if (aChildren.length !== bChildren.length) return false;

  for (let i = 0; i < aChildren.length; i++) {
    if (!templateEqual(aChildren[i], bChildren[i]) && !Object.is(aChildren[i], bChildren[i])) return false;
  }

  return true;
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

function createScopedId(label: string, key: string | number): string | null {
  if (!activeRenderState) return null;
  return `${activeRenderState.stack.join('/')}/${label}:${String(key)}`;
}

function getRenderKey(value: unknown): unknown {
  if (isTemplateNode(value)) return value.key;
  if (value instanceof Node) return getKey(value);
  return undefined;
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
    const nextStyle = value as Record<string, string | number | null | undefined>;
    const oldStyle = oldValue && typeof oldValue === 'object'
      ? oldValue as Record<string, string | number | null | undefined>
      : {};
    const styleNames = new Set([...Object.keys(oldStyle), ...Object.keys(nextStyle)]);

    for (const name of styleNames) {
      const next = nextStyle[name];
      const old = oldStyle[name];
      if (Object.is(next, old)) continue;
      try {
        (element.style as any)[name] = next == null ? '' : String(next);
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }
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

  for (const key of Object.keys(previousProps)) {
    if (key === 'children' || key === 'key') continue;
    if (!(key in nextProps)) setProp(element, key, undefined, previousProps[key], wrapEvent);
  }

  for (const key of Object.keys(nextProps)) {
    if (key === 'children' || key === 'key') continue;
    setProp(element, key, nextProps[key], previousProps[key], wrapEvent);
  }

  element.__memoProps = nextProps;
}

function canPatch(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;
  if (current.nodeType === Node.TEXT_NODE) return true;
  if (!isElement(current) || !isElement(next)) return false;
  return current.tagName === next.tagName && Object.is(getKey(current), getKey(next));
}

function canPatchTemplate(current: Node, next: unknown): boolean {
  if (isRenderClosure(next)) return canPatchTemplate(current, next());

  if (isTemplateNode(next)) {
    return isElement(current) && current.tagName.toLowerCase() === next.tag && Object.is(getKey(current), next.key);
  }

  if (next instanceof Node) return canPatch(current, next);

  return current.nodeType === Node.TEXT_NODE;
}

function patchNode(parent: Node, current: Node, next: unknown): Node {
  if (isRenderClosure(next)) return patchNode(parent, current, next());

  if (!canPatchTemplate(current, next)) {
    const replacement = toNode(next);
    parent.replaceChild(replacement, current);
    return replacement;
  }

  if (isTemplateNode(next)) {
    const currentElement = current as MemoElement;
    if (currentElement.__memoTemplate && templateEqual(currentElement.__memoTemplate, next)) {
      currentElement.__memoTemplate = next;
      return currentElement;
    }

    setProps(currentElement, next.props, activeEventWrapper ?? ((handler) => handler));
    currentElement.__memoKey = next.key;
    patchChildren(currentElement, next.children);
    currentElement.__memoTemplate = next;
    return currentElement;
  }

  if (!(next instanceof Node)) {
    const text = next == null || typeof next === 'boolean' ? '' : String(next);
    if (current.textContent !== text) current.textContent = text;
    return current;
  }

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

function normalizeChildren(value: unknown): unknown[] {
  if (isRenderClosure(value)) return normalizeChildren(value());
  if (value instanceof DocumentFragment) return Array.from(value.childNodes);
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value.flat(Infinity)) {
      if (item === null || item === undefined || item === false || item === true) continue;
      out.push(item);
    }
    return out;
  }
  if (value === null || value === undefined || value === false || value === true) return [];
  return [value];
}

function patchChildren(parent: Node, nextChildren: unknown[]) {
  nextChildren = normalizeChildren(nextChildren);

  if (nextChildren.length === 0) {
    if (parent.firstChild) parent.textContent = '';
    return;
  }

  const oldChildren = Array.from(parent.childNodes);

  if (oldChildren.length === 0) {
    const fragment = document.createDocumentFragment();
    for (const next of nextChildren) {
      fragment.appendChild(toNode(next));
    }
    parent.appendChild(fragment);
    return;
  }

  const keyedOld = new Map<unknown, Node>();
  const usedOld = new Set<Node>();
  const patchedNodes: Node[] = [];
  let oldCursor = 0;

  for (const child of oldChildren) {
    const key = getKey(child);
    if (key !== undefined) keyedOld.set(key, child);
  }

  for (const next of nextChildren) {
    const key = getRenderKey(next);
    let match: Node | undefined;

    if (key !== undefined) {
      match = keyedOld.get(key);
    } else {
      while (oldCursor < oldChildren.length) {
        const candidate = oldChildren[oldCursor++];
        if (!candidate || usedOld.has(candidate) || getKey(candidate) !== undefined) continue;
        match = candidate;
        break;
      }
    }

    if (match && usedOld.has(match)) match = undefined;

    const patched = match ? patchNode(parent, match, next) : toNode(next);
    usedOld.add(patched);
    patchedNodes.push(patched);
  }

  for (const child of oldChildren) {
    if (!usedOld.has(child) && child.parentNode === parent) {
      child.remove();
    }
  }

  placePatchedNodes(parent, patchedNodes, oldChildren);
}

function placePatchedNodes(parent: Node, nodes: Node[], oldChildren: Node[]) {
  const oldIndexes = new Map<Node, number>();
  for (let i = 0; i < oldChildren.length; i++) oldIndexes.set(oldChildren[i]!, i);

  const indexes = nodes.map((node) => oldIndexes.get(node) ?? NO_INDEX);
  const stableIndexes = longestIncreasingSubsequence(indexes);
  let stableCursor = stableIndexes.length - 1;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!;
    const anchor = nodes[i + 1] ?? null;
    const isStable = stableCursor >= 0 && stableIndexes[stableCursor] === i;

    if (isStable && node.parentNode === parent) {
      stableCursor--;
      continue;
    }

    if (node.parentNode !== parent || node.nextSibling !== anchor) {
      parent.insertBefore(node, anchor);
    }
  }
}

function longestIncreasingSubsequence(values: number[]): number[] {
  const predecessors = new Array<number>(values.length);
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    if (value === NO_INDEX) continue;

    let low = 0;
    let high = result.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (values[result[mid]!]! < value) low = mid + 1;
      else high = mid;
    }

    if (low > 0) predecessors[i] = result[low - 1]!;
    result[low] = i;
  }

  let cursor = result.length ? result[result.length - 1]! : NO_INDEX;
  for (let i = result.length - 1; i >= 0; i--) {
    result[i] = cursor;
    cursor = predecessors[cursor] ?? NO_INDEX;
  }

  return result;
}

function patchRoot(root: Element, next: unknown) {
  patchChildren(root, normalizeChildren(next));
}

function createNodeFromTemplate(template: TemplateNode): Node {
  const node = createMemoElement(template.tag, template.props, template.children) as MemoElement;
  node.__memoTemplate = template;
  return node;
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

function createTemplateElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: MemoProps,
  children: MemoChild[],
): TemplateNode {
  const normalizedProps = { ...(props ?? {}) };
  const key = 'key' in normalizedProps ? normalizedProps.key : undefined;
  return {
    __auwlaTemplate: true,
    tag,
    props: normalizedProps,
    children,
    key,
  };
}

export function memo(key: string | number, deps: readonly unknown[], render: () => MemoChild): MemoChild {
  const id = createScopedId('memo', key);
  const state = activeRenderState;
  if (!id || !state) return render();

  const cached = state.memos.get(id);
  state.seen.add(id);

  if (cached && sameDeps(cached.deps, deps)) {
    return cached.value;
  }

  const value = render();
  state.memos.set(id, { deps: [...deps], value });
  return value;
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
  const memoBlocks = new Map<string, MemoBlock>();
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
      memos: memoBlocks,
      seen: new Set(),
      stack: ['root'],
      counters: [0],
    };
    activeEventWrapper = (handler) => ctx.event((event) => handler(event));
    activeRenderState = renderState;
    try {
      const output = view ? view(ctx) : isRenderClosure(app) ? app() : app;
      patchRoot(root, output);
      for (const id of componentInstances.keys()) {
        if (!renderState.seen.has(id)) componentInstances.delete(id);
      }
      for (const id of memoBlocks.keys()) {
        if (!renderState.seen.has(id)) memoBlocks.delete(id);
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
        const result = handler(event, model as TModel);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          void (result as Promise<unknown>).finally(invalidate);
        } else {
          invalidate();
        }
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
      memoBlocks.clear();
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
export function h(type: any, props?: MemoProps, ...children: MemoChild[]): MemoChild {
  if (typeof type === 'function') {
    return createComponentClosure(type, props, children);
  }

  if (activeRenderState) {
    return createTemplateElement(type, props, children);
  }

  return createMemoElement(type, props, children);
}

export function Fragment(props: { children?: MemoChild | MemoChild[] } = {}): DocumentFragment {
  return toNode(Array.isArray(props.children) ? props.children : [props.children]) as DocumentFragment;
}
