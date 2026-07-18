/**
 * @fileoverview App lifecycle, render loop, and public entry points.
 *
 * `createMemoApp` mounts an app into a root element and manages the
 * microtask-based invalidation cycle. `commit()` triggers scoped or full
 * re-renders across mounted apps.
 */

import { runtimeState } from './state';
import { createEventListener as createAppEventListener } from './event';
import {
  bootstrapIslands,
  clearExposedInvalidate,
  exposeInvalidateForChunkWarmers,
  getTrackGlobals,
  hydrateTrackData,
  shouldHydrate,
} from './hydration';
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
import { enterHydration, exitHydration } from '../compiler-runtime/template';

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
  hydrateTrackData();
  bootstrapIslands(root);

  const cache = new Map<string | number, MemoEntry>();
  const componentInstances = new Map<string, ComponentInstance>();
  const memoBlocks = new Map<string, import('./types').MemoBlock>();
  const componentSourceDeps = new Map<string, Set<string>>();
  const componentSourceComponents = new Map<string, Set<string>>();
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

  // Pooled render-cycle structures — reused across renders to avoid GC pressure.
  const pooledSeen = new Set<string>();
  const pooledRendered = new Set<string>();
  const pooledCounters = new Map<string, number>();
  const pooledStack: string[] = ['root'];
  const pooledEventWrapper: import('./types').EventWrapper = (handler, ownerId) => createEventListener((event) => handler(event), ownerId);

  const renderNow = () => {
    if (!scheduled || destroyed) return;
    scheduled = false;
    const previousWrapper = runtimeState.activeEventWrapper;
    const previousRenderState = runtimeState.activeRenderState;

    // Reset pooled structures instead of allocating new ones.
    pooledSeen.clear();
    pooledRendered.clear();
    pooledCounters.clear();
    pooledStack.length = 1;
    pooledStack[0] = 'root';

    const renderState: import('./types').RenderState = {
      instances: componentInstances,
      memos: memoBlocks,
      seen: pooledSeen,
      rendered: pooledRendered,
      stack: pooledStack,
      counters: pooledCounters,
      dirty: dirtyComponents,
      dirtySources,
      sourceDeps: componentSourceDeps,
      sourceComponents: componentSourceComponents,
      invalidate,
    };
    dirtyComponents = new Set();
    dirtySources = new Set();
    runtimeState.activeEventWrapper = pooledEventWrapper;
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

      // Single-pass orphan collection (P3): each instance's verdict is
      // decided by walking up its ancestor chain once, memoizing per id —
      // no repeated full-map rescans per tree depth.
      const verdict = new Map<string, boolean>();
      const shouldDelete = (id: string): boolean => {
        const cached = verdict.get(id);
        if (cached !== undefined) return cached;
        const chain: string[] = [];
        let current = id;
        let result = false;
        while (true) {
          const hit = verdict.get(current);
          if (hit !== undefined) { result = hit; break; }
          chain.push(current);
          if (renderState.seen.has(current)) { result = false; break; }
          const sep = current.lastIndexOf('/');
          const parentId = sep >= 0 ? current.slice(0, sep) : null;
          if (!parentId || parentId === 'root' || renderState.rendered.has(parentId)) {
            result = true;
            break;
          }
          if (!componentInstances.has(parentId)) { result = false; break; }
          current = parentId;
        }
        for (const cid of chain) verdict.set(cid, result);
        return result;
      };

      const toDelete: [string, import('./types').ComponentInstance][] = [];
      for (const [id, inst] of componentInstances.entries()) {
        if (shouldDelete(id)) toDelete.push([id, inst]);
      }
      runInstanceCleanups(toDelete);
      for (const [id] of toDelete) {
        componentInstances.delete(id);
        runtimeState.componentHosts.delete(id);
        removeFromSourceIndex(id);
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
      // Prune ctx.memo entries whose owner component is gone (M10) — the
      // cache was previously only cleared on destroy(), so dynamic keys
      // (e.g. row ids) grew without bound. ('root' is the root view's scope;
      // it is never an instance and must be kept.)
      for (const key of cache.keys()) {
        if (typeof key !== 'string') continue;
        const sep = key.indexOf('/memo:');
        if (sep < 0) continue;
        const ownerId = key.slice(0, sep);
        if (ownerId !== 'root' && !componentInstances.has(ownerId)) {
          cache.delete(key);
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

  const removeFromSourceIndex = (id: string) => {
    const deps = componentSourceDeps.get(id);
    if (deps) {
      for (const source of deps) {
        const components = componentSourceComponents.get(source);
        if (components) {
          components.delete(id);
          if (components.size === 0) componentSourceComponents.delete(source);
        }
      }
    }
    componentSourceDeps.delete(id);
  };

  const consumePendingDirtySources = () => {
    if (dirtySources === null) return;
    for (const source of runtimeState.pendingDirtySources) {
      dirtySources.add(source);
      if (dirtyComponents === null) continue;
      // Inverted index: touch only components that depend on this source
      // instead of scanning every component (P3).
      const dependents = componentSourceComponents.get(source);
      if (!dependents) continue;
      for (const componentId of dependents) markDirtyPath(componentId);
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

  const eventDeps = {
    invalidate,
    isScheduled: () => scheduled,
    isDestroyed: () => destroyed,
  };
  const createEventListener = (
    handler: (event: Event, model: TModel) => unknown,
    ownerId: string | null = runtimeState.activeSetupComponentId,
  ): EventListener => createAppEventListener(eventDeps, handler, model as TModel, ownerId);

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
      // Scope the cache key by the rendering component's id path — the same
      // namespacing the module-level memo() uses — so two components that
      // happen to share a raw key don't collide (M10).
      const state = runtimeState.activeRenderState;
      const scopedKey = state
        ? `${state.stack[state.stack.length - 1]}/memo:${String(key)}`
        : String(key);
      const cached = cache.get(scopedKey);
      if (cached && sameDeps(cached.deps, deps)) {
        return cached.node;
      }
      const node = toNode(render());
      cache.set(scopedKey, { deps: [...deps], node });
      return node;
    },
  };

  // enterHydration seeds the cursor; exitHydration clears it after the
  // first render so subsequent re-renders clone normally.
  const isHydrating = shouldHydrate(root);
  if (isHydrating) {
    skipFirstHydrationPatch = true;
    enterHydration(root);
    exposeInvalidateForChunkWarmers(invalidate);
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
      // Mirror the render-loop GC for every instance: hosts, dirty-source
      // deps, computed getters, effects, and track state all live in global
      // registries and must not outlive the app.
      for (const [id] of allInstances) {
        runtimeState.componentHosts.delete(id);
        removeFromSourceIndex(id);
        clearComponentComputedGetters(id);
        clearComponentEffects(id);
        getTrackGlobals().cleanupComponentTracks?.(id);
      }
      componentInstances.clear();
      memoBlocks.clear();
      runtimeState.mountedApps.delete(mountedApp);
      clearExposedInvalidate(invalidate);
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
