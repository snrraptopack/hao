/**
 * @fileoverview App lifecycle, render loop, and public entry points.
 *
 * `createMemoApp` mounts an app into a root element and manages the
 * microtask-based invalidation cycle. `commit()` triggers scoped or full
 * re-renders across mounted apps.
 */

import { runtimeState } from './state';
import type {
  ComponentHandle,
  ComponentInstance,
  MemoApp,
  MemoChild,
  MemoContext,
  MemoDeps,
  MemoEntry,
  RenderClosure,
} from './types';
import { isRenderClosure } from './types';
import { sameDeps } from '../shared/deps';
import { createMemoElement, toNode } from './dom';
import { runInstanceCleanups } from './component';
import { patchRoot } from './patch';

/**
 * Memoize a stable subtree inside a component.
 *
 * When `deps` are unchanged, the previously created DOM node is reused
 * without re-running `render()`.
 */
export function memo(key: string | number, deps: readonly unknown[], render: () => MemoChild): MemoChild {
  const state = runtimeState.activeRenderState;
  if (!state) return render();

  const id = `${state.stack[state.stack.length - 1]}/memo:${String(key)}`;
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
 * Triggers a re-render.
 *
 * - `commit()` — re-renders all mounted apps (full invalidation).
 * - `commit(handle)` — re-renders only the component subtree captured by `component()`.
 * - `commit(h1, h2)` — re-renders multiple specific component subtrees.
 */
export function commit(...handles: ComponentHandle[]): void {
  if (handles.length === 0) {
    for (const app of runtimeState.mountedApps) {
      app.invalidate();
    }
  } else {
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
  const memoBlocks = new Map<string, import('./types').MemoBlock>();
  let dirtyComponents: Set<string> | null = null;
  let scheduled = false;
  let destroyed = false;
  const model = view ? modelOrApp as TModel : undefined;
  const app = view ? null : modelOrApp as MemoChild | RenderClosure;

  const renderNow = () => {
    if (destroyed) return;
    scheduled = false;
    const previousWrapper = runtimeState.activeEventWrapper;
    const previousRenderState = runtimeState.activeRenderState;
    const renderState: import('./types').RenderState = {
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
    runtimeState.activeEventWrapper = (handler, ownerId) => createEventListener((event) => handler(event), ownerId);
    runtimeState.activeRenderState = renderState;
    try {
      const output = view ? view(ctx) : isRenderClosure(app) ? app() : app;
      patchRoot(root, output);

      const toDelete: [string, import('./types').ComponentInstance][] = [];
      const deletedIds = new Set<string>();
      for (const [id, inst] of componentInstances.entries()) {
        if (renderState.seen.has(id)) continue;
        const sep = id.lastIndexOf('/');
        const parentId = sep >= 0 ? id.slice(0, sep) : null;
        if (!parentId || parentId === 'root' || renderState.rendered.has(parentId)) {
          toDelete.push([id, inst]);
          deletedIds.add(id);
        }
      }
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
      runtimeState.activeEventWrapper = previousWrapper;
      runtimeState.activeRenderState = previousRenderState;
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
  const mountedApp: import('./types').MountedApp = { invalidate };

  const createEventListener = (
    handler: (event: Event, model: TModel) => unknown,
    ownerId: string | null = runtimeState.activeSetupComponentId,
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
  runtimeState.mountedApps.add(mountedApp);

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
      const allInstances: [string, import('./types').ComponentInstance][] = Array.from(componentInstances.entries());
      runInstanceCleanups(allInstances);
      if (topLevelCleanups) {
        for (const fn of topLevelCleanups) fn();
      }
      cache.clear();
      componentInstances.clear();
      memoBlocks.clear();
      runtimeState.mountedApps.delete(mountedApp);
      root.replaceChildren();
    },
  };
}
