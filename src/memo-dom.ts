export type RenderClosure = () => MemoChild;
export type MemoChild = Node | string | number | boolean | null | undefined | RenderClosure | TemplateNode | readonly unknown[];
type EventHandler = (event: Event) => unknown;
export type MemoProps = Record<string, unknown> | null | undefined;
type EventWrapper = (handler: EventHandler, ownerId?: string | null) => EventListener;
type ComponentType = (props: Record<string, unknown>) => MemoChild | RenderClosure;
type MemoElement = HTMLElement & {
  __memoKey?: unknown;
  __memoProps?: Record<string, unknown>;
  __memoListeners?: Map<string, EventListener>;
  __memoTemplate?: TemplateNode;
};
type TemplateNode = {
  __auwlaTemplate: true;
  __auwlaDirty?: boolean;
  ownerId: string | null;
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
  value?: MemoChild;
  cleanups?: (() => void)[];
};
type RenderState = {
  instances: Map<string, ComponentInstance>;
  memos: Map<string, MemoBlock>;
  seen: Set<string>;
  rendered: Set<string>;
  stack: string[];
  counters: number[];
  dirty: Set<string> | null;
  invalidate: (ownerId?: string | null) => void;
};
type MemoBlock = {
  deps: readonly unknown[];
  value: MemoChild;
};

/**
 * Opaque handle to a component instance, captured during setup.
 * Pass to `commit()` to re-render only that component's subtree.
 */
export type ComponentHandle = {
  /** @internal */
  readonly _id: string;
  /** @internal */
  readonly _invalidate: (ownerId?: string | null) => void;
};

const NO_INDEX = -1;

let activeEventWrapper: EventWrapper | null = null;
let activeRenderState: RenderState | null = null;
let activeSetupComponentId: string | null = null;
let pendingCleanups: (() => void)[] | null = null;
const mountedApps = new Set<MountedApp>();

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

type MountedApp = {
  invalidate(): void;
};

type MemoEntry = {
  deps: MemoDeps;
  node: Node;
};

export function __wrapCompilerEvent(handler: EventHandler): EventListener {
  return (activeEventWrapper ?? ((eventHandler) => eventHandler))(handler);
}

function currentComponentId(): string | null {
  if (!activeRenderState) return null;
  const id = activeRenderState.stack[activeRenderState.stack.length - 1];
  return id && id !== 'root' ? id : null;
}

/**
 * Captures a handle to the current component during setup.
 * The returned handle can be passed to `commit()` to trigger a
 * scoped re-render of only this component and its ancestors.
 *
 * Must be called during component setup (the outer function body),
 * not inside the render callback.
 */
export function component(): ComponentHandle {
  // Nested component — has render context and a known component ID
  if (activeRenderState && activeSetupComponentId) {
    return { _id: activeSetupComponentId, _invalidate: activeRenderState.invalidate };
  }

  // Top-level component (e.g. createMemoApp(root, <App />)) — no render context yet.
  // Return a handle that falls back to full invalidation via commit().
  return {
    _id: '',
    _invalidate() {
      for (const app of mountedApps) {
        app.invalidate();
      }
    },
  };
}

/**
 * Registers a callback that runs when the component is removed from the tree,
 * replaced by a different component type, or the app is destroyed.
 *
 * Multiple calls are allowed — each resource can register its own cleanup.
 * Cleanups run children-before-parents to respect dependency ordering.
 *
 * Must be called during component setup (the outer function body).
 */
export function cleanup(fn: () => void): void {
  if (!pendingCleanups) {
    throw new Error('cleanup() must be called during component setup');
  }
  pendingCleanups.push(fn);
}

/**
 * Runs cleanup callbacks for a list of component entries.
 * Sorts deepest-first so children clean up before parents.
 */
function runInstanceCleanups(entries: [string, ComponentInstance][]): void {
  entries.sort((a, b) => {
    let depthA = 0;
    let depthB = 0;
    for (const c of a[0]) if (c === '/') depthA++;
    for (const c of b[0]) if (c === '/') depthB++;
    return depthB - depthA;
  });
  for (const [, inst] of entries) {
    if (inst.cleanups) {
      for (const fn of inst.cleanups) fn();
    }
  }
}

function sameDeps(a: MemoDeps, b: MemoDeps): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

export function toNode(child: unknown): Node {
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
  if (isRenderClosure(a) || isRenderClosure(b)) return false;
  if (!isTemplateNode(a) || !isTemplateNode(b) || b.__auwlaDirty) return false;
  if (a.tag !== b.tag || !Object.is(a.key, b.key)) return false;
  if (!objectShallowEqual(a.props, b.props)) return false;

  const aChildren = normalizeTemplateChildren(a.children);
  const bChildren = normalizeTemplateChildren(b.children);
  if (aChildren.length !== bChildren.length) return false;

  for (let i = 0; i < aChildren.length; i++) {
    if (!templateEqual(aChildren[i], bChildren[i]) && !Object.is(aChildren[i], bChildren[i])) return false;
  }

  return true;
}

function normalizeTemplateChildren(value: unknown): unknown[] {
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

function componentLabel(type: ComponentType): string {
  return type.name || 'Anonymous';
}

function createComponentId(type: ComponentType, props: MemoProps): string | null {
  if (!activeRenderState) return null;

  const depth = activeRenderState.stack.length;
  const slot = activeRenderState.counters[depth] ?? 0;
  activeRenderState.counters[depth] = slot + 1;
  const key = props && 'key' in props ? props.key : slot;
  const parent = activeRenderState.stack[activeRenderState.stack.length - 1];
  return `${parent}/${componentLabel(type)}:${String(key)}`;
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
    const prevCleanups = pendingCleanups;
    pendingCleanups = [];
    const output = type(nextProps);
    const cleanups = pendingCleanups.length > 0 ? pendingCleanups : undefined;
    pendingCleanups = prevCleanups;
    // Top-level cleanups stored via __pendingCleanups for createMemoApp to collect
    if (cleanups) (output as any).__pendingCleanups = cleanups;
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
      // Run old instance's cleanups before replacing (type change)
      if (instance?.cleanups) {
        for (const fn of instance.cleanups) fn();
      }
      const stableProps = { ...nextProps };
      const prevSetupId = activeSetupComponentId;
      const prevCleanups = pendingCleanups;
      activeSetupComponentId = id;
      pendingCleanups = [];
      const output = type(stableProps);
      activeSetupComponentId = prevSetupId;
      const cleanups = pendingCleanups.length > 0 ? pendingCleanups : undefined;
      pendingCleanups = prevCleanups;
      instance = {
        type,
        key: props && 'key' in props ? props.key : undefined,
        props: stableProps,
        render: isRenderClosure(output) ? output : () => output,
        cleanups,
      };
      state.instances.set(id, instance);
    } else {
      const propsChanged = !objectShallowEqual(instance.props, nextProps);
      updateProps(instance.props, nextProps);
      if (propsChanged) state.dirty?.add(id);
    }

    state.seen.add(id);
    if (state.dirty && !state.dirty.has(id) && 'value' in instance) {
      return instance.value;
    }

    state.rendered.add(id);
    const value = runInComponent(id, instance.render);
    instance.value = value;
    return value;
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
  const parent = activeRenderState.stack[activeRenderState.stack.length - 1];
  return `${parent}/${label}:${String(key)}`;
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

    for (const name of Object.keys(oldStyle)) {
      if (name in nextStyle) continue;
      try {
        (element.style as any)[name] = '';
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }

    for (const name of Object.keys(nextStyle)) {
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
  ownerId: string | null = null,
) {
  const previousProps = element.__memoProps ?? {};

  for (const key of Object.keys(previousProps)) {
    if (key === 'children' || key === 'key') continue;
    if (!(key in nextProps)) setProp(element, key, undefined, previousProps[key], wrapEvent);
  }

  for (const key of Object.keys(nextProps)) {
    if (key === 'children' || key === 'key') continue;
    setProp(element, key, nextProps[key], previousProps[key], (handler) => wrapEvent(handler, ownerId));
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

export function patchNode(parent: Node, current: Node, next: unknown): Node {
  if (isRenderClosure(next)) return patchNode(parent, current, next());
  if (current === next) return current;

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

    setProps(currentElement, next.props, activeEventWrapper ?? ((handler) => handler), next.ownerId);
    currentElement.__memoKey = next.key;
    patchChildren(currentElement, next.children);
    next.__auwlaDirty = false;
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
  const node = createMemoElement(template.tag, template.props, template.children, activeEventWrapper ?? ((handler) => handler), template.ownerId) as MemoElement;
  template.__auwlaDirty = false;
  node.__memoTemplate = template;
  return node;
}

export function createMemoElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: MemoProps,
  children: MemoChild[],
  wrapEvent: EventWrapper = activeEventWrapper ?? ((handler) => handler),
  ownerId: string | null = currentComponentId(),
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
      setProp(element, key, value, undefined, (handler) => wrapEvent(handler, ownerId));
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
  const normalizedProps = props ?? {};
  const key = 'key' in normalizedProps ? normalizedProps.key : undefined;
  return {
    __auwlaTemplate: true,
    ownerId: currentComponentId(),
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
  if (isTemplateNode(value)) value.__auwlaDirty = true;
  state.memos.set(id, { deps: [...deps], value });
  return value;
}

/**
 * Triggers a re-render.
 *
 * - `commit()` — re-renders all mounted apps (full invalidation).
 * - `commit(handle)` — re-renders only the component subtree captured by `component()`.
 * - `commit(h1, h2)` — re-renders multiple specific component subtrees.
 */
export function commit(...handles: ComponentHandle[]): void {
  if (handles.length === 0) {
    // Full re-render across all mounted apps
    for (const app of mountedApps) {
      app.invalidate();
    }
  } else {
    // Scoped re-render for each specified component
    for (const handle of handles) {
      handle._invalidate(handle._id);
    }
  }
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
  let dirtyComponents: Set<string> | null = null;
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
      rendered: new Set(),
      stack: ['root'],
      counters: [0],
      dirty: dirtyComponents,
      invalidate,
    };
    dirtyComponents = new Set();
    activeEventWrapper = (handler, ownerId) => createEventListener((event) => handler(event), ownerId);
    activeRenderState = renderState;
    try {
      const output = view ? view(ctx) : isRenderClosure(app) ? app() : app;
      patchRoot(root, output);

      // Only delete instances whose parent actually re-rendered.
      // If a parent was skipped (returned cached value), its children
      // were never visited but should be preserved.
      // Collect removable instances, run cleanups depth-first, then delete
      const toDelete: [string, ComponentInstance][] = [];
      const deletedIds = new Set<string>();
      // First pass: instances whose parent was rendered but didn't include them
      for (const [id, inst] of componentInstances.entries()) {
        if (renderState.seen.has(id)) continue;
        const sep = id.lastIndexOf('/');
        const parentId = sep >= 0 ? id.slice(0, sep) : null;
        if (!parentId || parentId === 'root' || renderState.rendered.has(parentId)) {
          toDelete.push([id, inst]);
          deletedIds.add(id);
        }
      }
      // Second pass: collect orphaned children whose parent is being deleted
      let foundMore = true;
      while (foundMore) {
        foundMore = false;
        for (const [id, inst] of componentInstances.entries()) {
          if (renderState.seen.has(id) || deletedIds.has(id)) continue;
          const sep = id.lastIndexOf('/');
          const parentId = sep >= 0 ? id.slice(0, sep) : null;
          if (parentId && deletedIds.has(parentId)) {
            toDelete.push([id, inst]);
            deletedIds.add(id);
            foundMore = true;
          }
        }
      }
      runInstanceCleanups(toDelete);
      for (const [id] of toDelete) {
        componentInstances.delete(id);
      }
      for (const id of memoBlocks.keys()) {
        if (renderState.seen.has(id)) continue;
        const sep = id.lastIndexOf('/');
        const parentId = sep >= 0 ? id.slice(0, sep) : null;
        if (!parentId || parentId === 'root' || renderState.rendered.has(parentId)) {
          memoBlocks.delete(id);
        }
      }
    } finally {
      activeEventWrapper = previousWrapper;
      activeRenderState = previousRenderState;
    }
  };

  const markDirty = (ownerId: string | null | undefined) => {
    if (!ownerId) {
      dirtyComponents = null;
      return;
    }

    if (dirtyComponents === null) return;

    let id = ownerId;
    while (id && id !== 'root') {
      dirtyComponents.add(id);
      const separator = id.lastIndexOf('/');
      if (separator < 0) break;
      id = id.slice(0, separator);
    }
  };

  const invalidate = (ownerId?: string | null) => {
    if (destroyed) return;
    markDirty(ownerId);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(renderNow);
  };
  const mountedApp: MountedApp = { invalidate };

  const createEventListener = (
    handler: (event: Event, model: TModel) => unknown,
    ownerId: string | null = currentComponentId(),
  ): EventListener => {
    return (event) => {
      const result = handler(event, model as TModel);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        void (result as Promise<unknown>).finally(() => invalidate(ownerId));
      } else {
        invalidate(ownerId);
      }
    };
  };

  const ctx: MemoContext<TModel> = {
    model: model as TModel,
    el(tag, props, ...children) {
      return createMemoElement(tag, props, children, (handler) => ctx.event((event) => handler(event)));
    },
    invalidate,
    event(handler) {
      return createEventListener(handler);
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
  mountedApps.add(mountedApp);

  // Collect any cleanup callbacks registered by the top-level component during setup
  let topLevelCleanups: (() => void)[] | undefined;
  if (isRenderClosure(app) && (app as any).__pendingCleanups) {
    topLevelCleanups = (app as any).__pendingCleanups;
    delete (app as any).__pendingCleanups;
  }

  return {
    ...(view ? { model: model as TModel } : {}),
    root,
    render: renderNow,
    destroy() {
      destroyed = true;
      scheduled = false;
      // Run all instance cleanups depth-first (children before parents)
      const allInstances: [string, ComponentInstance][] = Array.from(componentInstances.entries());
      runInstanceCleanups(allInstances);
      // Run top-level component cleanups last (root is the shallowest)
      if (topLevelCleanups) {
        for (const fn of topLevelCleanups) fn();
      }
      cache.clear();
      componentInstances.clear();
      memoBlocks.clear();
      mountedApps.delete(mountedApp);
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
