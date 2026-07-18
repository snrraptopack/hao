/**
 * @fileoverview Track registry and lifecycle machinery.
 *
 * The global (or per-request, during SSR) store for every tracked async
 * operation, plus the transition/cancellation primitives used by the handle
 * factory (handle.ts) and the query API (query.ts).
 */

import { runtimeState, currentComponentId } from '../runtime/state';
import { reactive } from '../runtime/reactive';
import type { ReactiveCell } from '../runtime/reactive';

export type TrackStatus = 'idle' | 'pending' | 'resolved' | 'rejected';

export type TrackOptions = {
  viewTransition?: boolean;
  /** @internal Skip the stale-while-revalidate background sync for this call. */
  skipBackgroundSync?: boolean;
};


export type TrackHandle<T = unknown> = {
  readonly name: string;
  readonly status: TrackStatus;
  readonly pending: boolean;
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly value: T | undefined;
  readonly reason: unknown;
  cancel(): void;
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | undefined | null): Promise<T | undefined>;
};

/** Internal track state stored in the global registry. */
export type TrackState = {
  /**
   * Reactive cell holding the current lifecycle status. Any component that
   * reads `.status` on the handle during a render pass subscribes to this
   * cell and re-renders automatically when the status changes.
   */
  statusCell: ReactiveCell<TrackStatus>;
  value: unknown;
  reason: unknown;
  controller: AbortController | null;
  promise: Promise<unknown> | null;
  stale?: boolean;
  /**
   * Per-key run token. Every new run (either overload) and every cancel()
   * bumps this; settle callbacks capture the token at run start and only
   * apply their transition when it is still current. This is what stops a
   * stale promise-overload run — which has no AbortController — from
   * overwriting a newer run's state.
   */
  token: number;
  /**
   * The route path that was active when this global remote query was first
   * started. Background syncs reuse this path so route-scoped queries don't
   * break when the user navigates away.
   */
  routePath?: string;
};

/** Global track registry keyed by `${componentId}::${name}`. */
const registry = new Map<string, TrackState>();

/** Tracks created by a given component (for bulk cancel on unmount). */
const componentTracks = new Map<string, Set<string>>();

export function getRegistry(): Map<string, TrackState> {
  const provider = (globalThis as any).__auwla_trackRegistryProvider as
    | (() => Map<string, TrackState> | undefined)
    | undefined;
  if (provider) {
    const r = provider();
    if (r) return r;
  }
  return registry;
}

/**
 * Get the active component-tracks index.
 *
 * During SSR this returns the per-request ALS-backed Map; on the client it
 * returns the module-level singleton.
 */
export function getComponentTracks(): Map<string, Set<string>> {
  const provider = (globalThis as any).__auwla_trackComponentTracksProvider as
    | (() => Map<string, Set<string>> | undefined)
    | undefined;
  if (provider) {
    const ct = provider();
    if (ct) return ct;
  }
  return componentTracks;
}

export function getComponentId(): string | null {
  return (
    runtimeState.activeSetupComponentId ??
    currentComponentId() ??
    runtimeState.activeHandlerComponentId ??
    null
  );
}

export function makeKey(name: string, componentId?: string | null): string {
  const cid = componentId ?? getComponentId() ?? '__global';
  return `${cid}::${name}`;
}

export function getOrCreate(key: string): TrackState {
  const reg = getRegistry();
  let state = reg.get(key);
  if (!state) {
    state = {
      statusCell: reactive<TrackStatus>('idle'),
      value: undefined,
      reason: undefined,
      controller: null,
      promise: null,
      token: 0,
    };
    reg.set(key, state);
  }
  return state;
}

/**
 * Subscribe the component whose setup function created this track to the
 * track's reactive cell. This makes the component re-render when the track
 * changes without requiring reactive reads inside the render callback.
 */
export function subscribeSetupComponent<T>(cell: ReactiveCell<T>): void {
  const state = runtimeState.activeRenderState;
  const id = runtimeState.activeSetupComponentId;
  if (state && id) {
    cell.get();
  }
}

export function registerForComponent(componentId: string, name: string) {
  const ct = getComponentTracks();
  let set = ct.get(componentId);
  if (!set) {
    set = new Set();
    ct.set(componentId, set);
  }
  set.add(name);
}

/**
 * Advance the track to a terminal status and notify all subscribers via the
 * reactive cell. Components that read `.status` / `.pending` / `.resolved` /
 * `.rejected` in their last render pass will be invalidated and re-rendered.
 */
function transition(key: string, status: TrackStatus, value?: unknown, reason?: unknown) {
  const state = getOrCreate(key);
  if (status === 'resolved') state.value = value;
  if (status === 'rejected') state.reason = reason;
  // statusCell.set() snapshots subscribers, clears the live set, then calls
  // invalidate(id) on each — identical to how the path reactive cell works.
  const oldStatus = state.statusCell.get();
  state.statusCell.set(status);
  
  // If the status was already the same, set() returns early, so we must manually notify subscribers
  // to ensure components re-render with the updated value/reason.
  if (oldStatus === status) {
    state.statusCell.notify();
  }
}

function flushSync() {
  const globalState = (globalThis as any).__auwla_runtimeState;
  if (globalState?.mountedApps) {
    for (const app of globalState.mountedApps) {
      app.flushSync();
    }
  }
}

export function applyTransition(key: string, status: TrackStatus, value?: unknown, reason?: unknown, options?: TrackOptions) {
  if (options?.viewTransition && typeof document !== 'undefined' && 'startViewTransition' in document) {
    const t = (document as any).startViewTransition(() => {
      transition(key, status, value, reason);
      flushSync();
    });
    t.ready?.catch(() => {});
    t.finished?.catch(() => {});
  } else {
    transition(key, status, value, reason);
  }
}


/** @internal */
export function cleanupComponentTracks(componentId: string): void {
  const ct = getComponentTracks();
  const reg = getRegistry();
  const names = ct.get(componentId);
  if (!names) return;
  for (const name of names) {
    const key = `${componentId}::${name}`;
    const state = reg.get(key);
    if (state?.controller) {
      state.controller.abort();
    }
    reg.delete(key);
  }
  ct.delete(componentId);
}

/** @internal Reset the track registry. Used by tests and HMR to avoid stale state. */
export function __resetTrackRegistry(): void {
  const reg = getRegistry();
  for (const state of reg.values()) {
    if (state.controller) {
      state.controller.abort();
    }
  }
  reg.clear();
  getComponentTracks().clear();
}

/**
 * Cancel the in-flight run for a track state, if any.
 *
 * Bumps the run token so settle callbacks from the cancelled run become
 * no-ops — this is what makes cancellation work for the promise overload,
 * which has no AbortController to abort (B9). The status only flips back to
 * 'idle' when the track is actually in-flight; a resolved/rejected track is
 * left untouched.
 */
export function cancelTrackState(state: TrackState | undefined): void {
  if (!state) return;
  state.token++;
  if (state.controller) {
    state.controller.abort();
    state.controller = null;
  }
  // Notify subscribers that the track is no longer in-flight.
  if (state.statusCell.get() === 'pending') {
    state.statusCell.set('idle');
  }
}
