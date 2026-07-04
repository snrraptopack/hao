/**
 * @fileoverview App lifecycle, render loop, and public entry points.
 *
 * `createMemoApp` mounts an app into a root element and manages the
 * microtask-based invalidation cycle. `commit()` triggers scoped or full
 * re-renders across mounted apps.
 */

import { runtimeState, BLOCKED_EVENT, SILENT_EVENT } from './state';
import type {
  ComponentHandle,
  ComponentInstance,
  MemoApp,
  MemoChild,
  MemoContext,
  MemoEntry,
  RenderClosure,
} from './types';
import { isRenderClosure } from './types';
import { sameDeps } from '../shared/deps';
import { createMemoElement, toNode } from './dom';
import { runInstanceCleanups } from './component';
import { patchRoot } from './patch';
import {
  clearComponentComputedGetters,
  clearComponentEffects,
  markComponentComputedDirty,
  runComponentEffects,
} from './computed';
const getTrackGlobals = (): {
  hasPendingLoaders?: () => boolean;
  hydrateTrackState?: (data: Record<string, unknown>) => void;
  cleanupComponentTracks?: (id: string) => void;
} => {
  const g = globalThis as any;
  return {
    hasPendingLoaders: g.__auwla_hasPendingLoaders,
    hydrateTrackState: g.__auwla_hydrateTrackState,
    cleanupComponentTracks: g.__auwla_cleanupComponentTracks,
  };
};
import { enterHydration, exitHydration } from '../compiler-runtime/template';

/** Events that fire rapidly and should be throttled to one render per frame. */
const HIGH_FREQUENCY_EVENTS = new Set([
  'input',
  'mousemove',
  'scroll',
  'touchmove',
  'wheel',
  'pointermove',
]);

/** Schedule a callback for the next animation frame, falling back to setTimeout in test environments. */
function scheduleFrame(callback: () => void): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
}

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
  if (typeof window !== 'undefined' && (window as any).__AUWLA_DATA__) {
    getTrackGlobals().hydrateTrackState?.((window as any).__AUWLA_DATA__);
    delete (window as any).__AUWLA_DATA__;
  }

  const cache = new Map<string | number, MemoEntry>();
  const componentInstances = new Map<string, ComponentInstance>();
  const memoBlocks = new Map<string, import('./types').MemoBlock>();
  const componentSourceDeps = new Map<string, Set<string>>();
  let dirtyComponents: Set<string> | null = null;
  let dirtySources: Set<string> | null = null;
  let scheduled = true;
  let destroyed = false;
  // Set to true when SSR content is detected (data-auwla-ssr). If the first
  // render produces null (e.g. lazy route chunk not yet loaded), patchRoot is
  // skipped so the SSR content stays visible until the chunk resolves.
  let skipFirstHydrationPatch = false;
  const model = view ? modelOrApp as TModel : undefined;
  const app = view ? null : modelOrApp as MemoChild | RenderClosure;

  const renderNow = () => {
    if (!scheduled || destroyed) return;
    scheduled = false;
    const previousWrapper = runtimeState.activeEventWrapper;
    const previousRenderState = runtimeState.activeRenderState;
    const renderState: import('./types').RenderState = {
      instances: componentInstances,
      memos: memoBlocks,
      seen: new Set(),
      rendered: new Set(),
      stack: ['root'],
      /**
       * Fresh Map every render cycle so stale counter entries from
       * previous renders never accumulate.  Each `createComponentId`
       * call increments only its own `(parent, name)` slot inside this
       * Map, and `runInComponent` no longer needs to manually reset
       * any depth-based index.
       */
      counters: new Map(),
      dirty: dirtyComponents,
      dirtySources,
      sourceDeps: componentSourceDeps,
      invalidate,
    };
    dirtyComponents = new Set();
    dirtySources = new Set();
    runtimeState.activeEventWrapper = (handler, ownerId) => createEventListener((event) => handler(event), ownerId);
    runtimeState.activeRenderState = renderState;
    try {
      let loops = 0;
      while (runtimeState.pendingEffectComponents.size > 0 && loops < 100) {
        loops++;
        const pending = Array.from(runtimeState.pendingEffectComponents);
        runtimeState.pendingEffectComponents.clear();
        for (const compId of pending) {
          runComponentEffects(compId);
        }
      }
      const output = view ? view(ctx) : isRenderClosure(app) ? app() : app;

      if (skipFirstHydrationPatch) {
        if (getTrackGlobals().hasPendingLoaders?.() ?? false) {
          return;
        }
        skipFirstHydrationPatch = false;
        exitHydration();
      }

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
        runtimeState.componentHosts.delete(id);
        componentSourceDeps.delete(id);
        clearComponentComputedGetters(id);
        clearComponentEffects(id);
        getTrackGlobals().cleanupComponentTracks?.(id);
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

  const markDirtyPath = (ownerId: string | null | undefined) => {
    if (!ownerId || dirtyComponents === null) return;
    let id = ownerId;
    while (id && id !== 'root') {
      dirtyComponents.add(id);
      const separator = id.lastIndexOf('/');
      if (separator < 0) break;
      id = id.slice(0, separator);
    }
  };

  const consumePendingDirtySources = () => {
    if (dirtySources === null) return;
    for (const source of runtimeState.pendingDirtySources) {
      dirtySources.add(source);
      if (dirtyComponents === null) continue;
      for (const [componentId, deps] of componentSourceDeps) {
        if (deps.has(source)) markDirtyPath(componentId);
      }
    }
    runtimeState.pendingDirtySources.clear();
  };

  const markDirty = (ownerId: string | null | undefined) => {
    consumePendingDirtySources();
    // Falsy OR the '__root' sentinel (top-level component with no real tree position)
    // both trigger a full invalidation — every component re-renders on the next pass.
    if (!ownerId || ownerId === '__root') {
      dirtyComponents = null;
      dirtySources = null;
      return;
    }
    if (dirtyComponents === null) return;
    markDirtyPath(ownerId);
  };

  const invalidate = (ownerId?: string | null) => {
    if (destroyed) return;
    if (ownerId && runtimeState.setupExecutingComponents.has(ownerId)) {
      return;
    }
    markComponentComputedDirty(ownerId);
    if (ownerId && ownerId !== '__root') {
      runtimeState.pendingEffectComponents.add(ownerId);
    }
    markDirty(ownerId);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(renderNow);
  };
  const flushSync = () => {
    if (scheduled && !destroyed) renderNow();
  };
  const mountedApp: import('./types').MountedApp = { invalidate, flushSync };

  const createEventListener = (
    handler: (event: Event, model: TModel) => unknown,
    ownerId: string | null = runtimeState.activeSetupComponentId,
  ): EventListener => {
    let frameId: number | null = null;

    const throttledInvalidate = () => {
      if (frameId !== null || scheduled || destroyed) return;
      frameId = scheduleFrame(() => {
        frameId = null;
        if (!destroyed) invalidate(ownerId);
      });
    };

    return (evt) => {
      const prevHandlerId = runtimeState.activeHandlerComponentId;
      runtimeState.activeHandlerComponentId = ownerId;
      try {
        const result = handler(evt, model as TModel);
        if (result !== undefined && result === BLOCKED_EVENT) return;
        if (result !== undefined && result === SILENT_EVENT) return;
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          void (result as Promise<unknown>).finally(() => {
            runtimeState.activeHandlerComponentId = prevHandlerId;
            invalidate(ownerId);
          });
          return;
        }
      } finally {
        runtimeState.activeHandlerComponentId = prevHandlerId;
      }
      if (HIGH_FREQUENCY_EVENTS.has(evt.type)) {
        throttledInvalidate();
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

  // Detect server-rendered content: if the root has child nodes and carries
  // the SSR marker attribute (set by the server adapter), hydrate instead of
  // wiping the DOM. enterHydration seeds the cursor; exitHydration clears it
  // after the first render so subsequent re-renders clone normally.
  const isHydrating = root.hasAttribute('data-auwla-ssr') && root.hasChildNodes();
  if (isHydrating) {
    skipFirstHydrationPatch = true;
    enterHydration(root);
    // Expose this app's invalidate so that lazy-chunk warmers (triggered by
    // hydrateTrackState when __AUWLA_DATA__ is present) can wake the render
    // loop once the component module is loaded into __mods.
    (globalThis as any).__auwla_invalidate = invalidate;
    renderNow();
  } else {
    renderNow();
  }
  runtimeState.mountedApps.add(mountedApp);

  let topLevelCleanups: (() => void)[] | undefined;
  if (isRenderClosure(app) && (app as any).__pendingCleanups) {
    topLevelCleanups = (app as any).__pendingCleanups;
    delete (app as any).__pendingCleanups;
  }

  return {
    ...(view ? { model: model as TModel } : {}),
    root,
    render: () => {
      if (destroyed) return;
      scheduled = true;
      dirtyComponents = null;
      dirtySources = null;
      renderNow();
    },
    destroy() {
      destroyed = true;
      scheduled = false;
      const allInstances: [string, import('./types').ComponentInstance][] = Array.from(componentInstances.entries());
      runInstanceCleanups(allInstances);
      if (topLevelCleanups) {
        for (const fn of topLevelCleanups) fn();
      }
      cache.clear();
      for (const [id] of allInstances) runtimeState.componentHosts.delete(id);
      componentInstances.clear();
      memoBlocks.clear();
      runtimeState.mountedApps.delete(mountedApp);
      root.replaceChildren();
    },
  };
}

/** 
 * Synchronously flushes all pending DOM updates across all mounted apps.
 * Useful when integrating with native APIs like document.startViewTransition.
 */
export function flushSync(): void {
  for (const app of runtimeState.mountedApps) {
    app.flushSync();
  }
}

