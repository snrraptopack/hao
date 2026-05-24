export type MemoChild = Node | string | number | boolean | null | undefined | readonly unknown[];
type EventHandler = (event: Event) => void;
export type MemoProps = Record<string, unknown> | null | undefined;
type EventWrapper = (handler: EventHandler) => EventListener;
type RenderClosure = () => MemoChild;

let activeEventWrapper: EventWrapper | null = null;

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

function replaceContents(root: Element, next: Node) {
  root.replaceChildren(next);
}

function isRenderClosure(value: unknown): value is RenderClosure {
  return typeof value === 'function';
}

function setProp(element: HTMLElement, key: string, value: unknown, wrapEvent: (handler: EventHandler) => EventListener) {
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

  if (key.startsWith('on') && typeof value === 'function') {
    const eventName = key.slice(2).toLowerCase();
    element.addEventListener(eventName, wrapEvent(value as EventHandler));
    return;
  }

  if (value === false || value === null || value === undefined) {
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

export function createMemoElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: MemoProps,
  children: MemoChild[],
  wrapEvent: EventWrapper = activeEventWrapper ?? ((handler) => handler)
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue;
      setProp(element, key, value, wrapEvent);
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    element.appendChild(toNode(child));
  }

  return element;
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
  let scheduled = false;
  let destroyed = false;
  const model = view ? modelOrApp as TModel : undefined;
  const app = view ? null : modelOrApp as MemoChild | RenderClosure;

  const renderNow = () => {
    if (destroyed) return;
    scheduled = false;
    const previousWrapper = activeEventWrapper;
    activeEventWrapper = (handler) => ctx.event((event) => handler(event));
    try {
      const output = view ? view(ctx) : isRenderClosure(app) ? app() : app;
      replaceContents(root, toNode(output));
    } finally {
      activeEventWrapper = previousWrapper;
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
        handler(event, model);
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
    const output = type({ ...(props ?? {}), children });
    return isRenderClosure(output) ? output : toNode(output);
  }

  return createMemoElement(type, props, children);
}

export function Fragment(props: { children?: MemoChild | MemoChild[] } = {}): DocumentFragment {
  return toNode(Array.isArray(props.children) ? props.children : [props.children]) as DocumentFragment;
}
