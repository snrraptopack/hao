/**
 * @fileoverview Async lifecycle tracking for the Auwla event system.
 *
 * `event.track()` wraps promises and async functions so the framework can
 * observe their lifecycle (pending → resolved/rejected) and re-render
 * subscribed components automatically.
 *
 * The returned handle is THENABLE — you can chain `.then()` just like a
 * normal promise — and has reactive state getters (`.pending`, `.resolved`,
 * `.value`, etc.) that can be read directly in render closures.
 *
 * Status transitions are propagated via a per-track ReactiveCell<TrackStatus>.
 * Any component that reads `.status` (or the derived `.pending`, `.resolved`,
 * `.rejected` booleans) during a render pass is automatically subscribed.
 * When the async operation settles, the cell's `.set()` invalidates only
 * those subscribers — no manual `commit()` or captured `invalidate` handle
 * is needed. This is the same mechanism used by the reactive path cell in
 * navigation.ts that drives URL-change re-renders.
 */

import { runtimeState, currentComponentId } from '../runtime/state';
import { reactive } from '../runtime/reactive';
import type { ReactiveCell } from '../runtime/reactive';
import { flushSync } from '../runtime/app';
import { rpcCall, getCurrentRoutePath } from '../client/rpc';
import { getRpcDispatcher } from '../runtime/rpc-dispatcher';
import { trackForm } from './form';
import type { ServerManifestTypes } from 'auwla/server-manifest';
import type { RemoteFunction } from '../server/types';

export type TrackStatus = 'idle' | 'pending' | 'resolved' | 'rejected';

export type TrackOptions = {
  viewTransition?: boolean;
  /** @internal Skip the stale-while-revalidate background sync for this call. */
  skipBackgroundSync?: boolean;
};

function dispatchRpc(
  key: string,
  args: unknown[],
  routePath: string,
  options?: TrackRemoteOptions & { method?: 'GET' | 'POST' },
): Promise<unknown> {
  const dispatcher = getRpcDispatcher();
  if (dispatcher) {
    return dispatcher(key, args, routePath, options);
  }
  return rpcCall(key, args, routePath, options);
}

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
type TrackState = {
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

/**
 * Get the active track registry.
 *
 * During SSR this returns the per-request ALS-backed Map so concurrent
 * requests cannot contaminate each other's state. On the client it falls
 * back to the module-level singleton.
 */
function getRegistry(): Map<string, TrackState> {
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
function getComponentTracks(): Map<string, Set<string>> {
  const provider = (globalThis as any).__auwla_trackComponentTracksProvider as
    | (() => Map<string, Set<string>> | undefined)
    | undefined;
  if (provider) {
    const ct = provider();
    if (ct) return ct;
  }
  return componentTracks;
}

function getComponentId(): string | null {
  return (
    runtimeState.activeSetupComponentId ??
    currentComponentId() ??
    runtimeState.activeHandlerComponentId ??
    null
  );
}

function makeKey(name: string, componentId?: string | null): string {
  const cid = componentId ?? getComponentId() ?? '__global';
  return `${cid}::${name}`;
}

function getOrCreate(key: string): TrackState {
  const reg = getRegistry();
  let state = reg.get(key);
  if (!state) {
    state = {
      statusCell: reactive<TrackStatus>('idle'),
      value: undefined,
      reason: undefined,
      controller: null,
      promise: null,
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
function subscribeSetupComponent<T>(cell: ReactiveCell<T>): void {
  const state = runtimeState.activeRenderState;
  const id = runtimeState.activeSetupComponentId;
  if (state && id) {
    cell.get();
  }
}

function registerForComponent(componentId: string, name: string) {
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

function applyTransition(key: string, status: TrackStatus, value?: unknown, reason?: unknown, options?: TrackOptions) {
  if (options?.viewTransition && typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as any).startViewTransition(() => {
      transition(key, status, value, reason);
      flushSync();
    });
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

/** @internal Extract the resolved state of all global queries for SSR hydration. */
export function __extractTrackState(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, state] of getRegistry().entries()) {
    if (key.startsWith('__global::remote:') && state.statusCell.get() === 'resolved') {
      const name = key.slice('__global::'.length);
      data[name] = state.value;
    }
  }
  return data;
}

/**
 * Seed the track registry from the SSR data payload embedded in the page.
 *
 * Call this once at client startup (before mounting the app) to pre-populate
 * `track.get` handles as already-resolved so components skip the network fetch
 * and render immediately from cache.
 *
 * @param data - The object from `window.__AUWLA_DATA__` injected by `renderToString`.
 */
export function hydrateTrackState(data: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(data)) {
    // Keys arrive as "remote:posts.getPost" — restore the full registry key.
    const key = `__global::${name}`;
    const state = getOrCreate(key);
    // Mark as resolved with the server value; promise resolves immediately.
    state.statusCell = reactive<TrackStatus>('resolved');
    state.value = value;
    state.promise = Promise.resolve(value);
  }
}

function createHandle<T = unknown>(key: string, promise: Promise<T>): TrackHandle<T> {
  const handle = {
    get name() {
      return key.split('::')[1]!;
    },
    /**
     * Reading `.status` inside a render closure calls `statusCell.get()`,
     * which registers the active component as a subscriber. When the promise
     * settles, `transition()` calls `statusCell.set()` and re-renders those
     * components automatically.
     */
    get status(): TrackStatus {
      return getRegistry().get(key)?.statusCell.get() ?? 'idle';
    },
    get pending() {
      return this.status === 'pending';
    },
    get resolved() {
      return this.status === 'resolved';
    },
    get rejected() {
      return this.status === 'rejected';
    },
    get value(): T | undefined {
      this.status;
      return getRegistry().get(key)?.value as T | undefined;
    },
    get reason() {
      this.status;
      return getRegistry().get(key)?.reason;
    },
    cancel() {
      const state = getRegistry().get(key);
      if (state?.controller) {
        state.controller.abort();
        state.controller = null;
        // Notify subscribers that the track is no longer in-flight.
        state.statusCell.set('idle');
      }
    },
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
    ) {
      return promise.then(onfulfilled, onrejected);
    },
    catch<TResult = never>(
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null,
    ) {
      return promise.catch(onrejected);
    },
    finally(onfinally?: (() => void) | undefined | null) {
      return promise.finally(onfinally);
    },
  };

  return handle as TrackHandle<T>;
}

/**
 * Start an async function under an AbortController. If a previous run for the
 * same key is still in-flight it is aborted first. Status transitions go
 * through `statusCell.set()` — no commit() or invalidate capture needed.
 */
function runAsyncTrack(
  key: string,
  fn: (signal: AbortSignal) => Promise<unknown>,
  options?: TrackOptions,
): Promise<unknown> {
  const state = getOrCreate(key);
  if (state.controller) {
    state.controller.abort();
  }
  const controller = new AbortController();
  state.controller = controller;
  // Replace the cell with a fresh instance so stale subscribers from a
  // previous run (e.g. a PostList rendered during an earlier navigation) are
  // NOT notified by this 'pending' transition — they subscribed to the OLD
  // cell and must not interfere with the new async lifecycle. The Router will
  // subscribe to this new cell when it reads cachedLoader.status after track()
  // returns, which is always within the same synchronous render pass.
  state.statusCell = reactive<TrackStatus>('pending');

  const promise = fn(controller.signal).then(
    (value) => {
      state.controller = null;
      if (controller.signal.aborted) {
        return undefined;
      }
      applyTransition(key, 'resolved', value, undefined, options);
      return value;
    },
    (reason) => {
      state.controller = null;
      if (controller.signal.aborted) {
        return undefined;
      }
      applyTransition(key, 'rejected', undefined, reason, options);
      return undefined;
    },
  );

  state.promise = promise;
  return promise;
}

/**
 * Track a promise or async function.
 *
 * The operation starts immediately. If another track with the same name is
 * already running, it is auto-cancelled first.
 *
 * Returns a thenable handle with reactive getters that reflect the current
 * lifecycle state. Reading `.status`, `.pending`, `.resolved`, or `.rejected`
 * during a render pass automatically subscribes the component — no manual
 * `commit()` calls needed.
 */
function trackImpl(name: string, promise: Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
function trackImpl(name: string, fn: (signal: AbortSignal) => Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
function trackImpl(promise: Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
function trackImpl(
  nameOrPromise: string | Promise<unknown>,
  maybePromiseOrFnOrOptions?: Promise<unknown> | ((signal: AbortSignal) => Promise<unknown>) | TrackOptions,
  maybeOptionsOrIsGlobal?: TrackOptions | boolean,
  isGlobalArg?: boolean,
): TrackHandle {
  let options: TrackOptions | undefined;
  let maybePromiseOrFn: Promise<unknown> | ((signal: AbortSignal) => Promise<unknown>) | undefined;
  let isGlobal = isGlobalArg ?? false;

  if (typeof nameOrPromise !== 'string') {
    options = maybePromiseOrFnOrOptions as TrackOptions | undefined;
    if (typeof maybeOptionsOrIsGlobal === 'boolean') {
      isGlobal = maybeOptionsOrIsGlobal;
    }
  } else {
    maybePromiseOrFn = maybePromiseOrFnOrOptions as any;
    if (typeof maybeOptionsOrIsGlobal === 'object') {
      options = maybeOptionsOrIsGlobal;
    }
  }

  // Overload: track(promise) — anonymous, auto-generated name
  if (typeof nameOrPromise !== 'string') {
    const name = `__auto_${Math.random().toString(36).slice(2)}`;
    const key = makeKey(name);
    // Anonymous track — key is random so getOrCreate always produces a new
    // state entry, but initialize at 'pending' directly for consistency.
    const state = getOrCreate(key);
    state.statusCell = reactive<TrackStatus>('pending');
    const promise = nameOrPromise.then(
      (value) => {
        applyTransition(key, 'resolved', value, undefined, options);
        return value;
      },
      (reason) => {
        applyTransition(key, 'rejected', undefined, reason, options);
        return undefined;
      },
    );
    state.promise = promise;
    subscribeSetupComponent(state.statusCell);
    return createHandle(key, promise);
  }

  const name = nameOrPromise;
  const cid = isGlobal ? '__global' : getComponentId();
  const key = makeKey(name, cid);
  if (cid && cid !== '__global') registerForComponent(cid, name);

  // Overload: track(name, promise)
  if (maybePromiseOrFn && typeof maybePromiseOrFn === 'object' && 'then' in maybePromiseOrFn) {
    const state = getOrCreate(key);

    if (isGlobal) {
      // Remember the route path that this remote query was started with so
      // background syncs don't accidentally switch to a different route.
      if (!state.routePath) {
        state.routePath = getCurrentRoutePath();
      }

      // 1. Deduplicate concurrent in-flight requests
      if (state.statusCell.get() === 'pending' && state.promise) {
        subscribeSetupComponent(state.statusCell);
        return createHandle(key, state.promise);
      }

      // 2. Stale-While-Revalidate: return cached instantly, sync in background
      if (state.statusCell.get() === 'resolved' && !state.stale) {
        const existingPromise = state.promise!;

        if (!options?.skipBackgroundSync) {
          const newPromise = maybePromiseOrFn as Promise<unknown>;
          newPromise.then(
            (value) => {
              // Only update and trigger re-render if the value changed
              if (JSON.stringify(state.value) !== JSON.stringify(value)) {
                applyTransition(key, 'resolved', value, undefined, options);
              }
              state.promise = Promise.resolve(value);
            },
            (reason) => {
              console.error(`Background sync failed for query "${name}":`, reason);
              applyTransition(key, 'rejected', undefined, reason, options);
              state.promise = Promise.reject(reason);
            }
          );
        }

        subscribeSetupComponent(state.statusCell);
        return createHandle(key, existingPromise);
      }

      // If the cache was marked as stale, clear the flag and fall through to trigger a fresh request
      if (state.stale) {
        state.stale = false;
      }
    }

    if (state.controller) {
      state.controller.abort();
      state.controller = null;
    }
    // Fresh cell — cuts off any stale subscribers from the previous run.
    state.statusCell = reactive<TrackStatus>('pending');
    const promise = (maybePromiseOrFn as Promise<unknown>).then(
      (value) => {
        applyTransition(key, 'resolved', value, undefined, options);
        return value;
      },
      (reason) => {
        applyTransition(key, 'rejected', undefined, reason, options);
        return undefined;
      },
    );
    state.promise = promise;
    subscribeSetupComponent(state.statusCell);
    return createHandle(key, promise);
  }

  // Overload: track(name, asyncFn) — starts immediately with AbortSignal
  const fn = maybePromiseOrFn as (signal: AbortSignal) => Promise<unknown>;
  const promise = runAsyncTrack(key, fn, options);
  subscribeSetupComponent(getOrCreate(key).statusCell);
  return createHandle(key, promise);
}

/** Return whether a named track (or any track if no name given) is pending. */
export function pending(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of getRegistry()) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'pending') return true;
    }
    return false;
  }
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'pending';
}

/** Return whether a named track (or any track if no name given) has resolved. */
export function resolved(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of getRegistry()) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'resolved') return true;
    }
    return false;
  }
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'resolved';
}

/** Return whether a named track (or any track if no name given) has rejected. */
export function rejected(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of getRegistry()) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'rejected') return true;
    }
    return false;
  }
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'rejected';
}

/** Return the resolved value of a named track. */
export function value<T = unknown>(name: string): T | undefined {
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'resolved' ? (state.value as T) : undefined;
}

/** Return the rejection reason of a named track. */
export function reason(name: string): unknown {
  const state = getRegistry().get(makeKey(name));
  return state?.statusCell.get() === 'rejected' ? state.reason : undefined;
}

/** Cancel a named track (or all tracks for the current component if no name). */
export function cancel(name?: string): void {
  if (name === undefined) {
    const cid = getComponentId();
    if (cid) cleanupComponentTracks(cid);
    return;
  }
  const key = makeKey(name);
  const state = getRegistry().get(key);
  if (state?.controller) {
    state.controller.abort();
    state.controller = null;
    // Notify subscribers that the track is no longer in-flight.
    state.statusCell.set('idle');
  }
}

// -----------------------------------------------------------------------------
// Fullstack remote functions
// -----------------------------------------------------------------------------

export type TrackRemoteOptions = TrackOptions & {
  signal?: AbortSignal;
  /** Override the route path used to extract server params. Defaults to the current browser URL. */
  routePath?: string;
};

/**
 * Keys in the server manifest that are declared as GET.
 */
type GetKeys = {
  [K in keyof ServerManifestTypes]: ServerManifestTypes[K] extends { method: 'GET' }
  ? K
  : never;
}[keyof ServerManifestTypes];

/**
 * Keys in the server manifest that are declared as POST.
 */
type PostKeys = {
  [K in keyof ServerManifestTypes]: ServerManifestTypes[K] extends { method: 'POST' }
  ? K
  : never;
}[keyof ServerManifestTypes];

/**
 * Lazy command handle returned by track.post().
 *
 * `.run()` triggers the RPC. `.result` exposes the underlying TrackHandle so
 * post-mutation state can be rendered reactively.
 */
export type CommandHandle<TArgs extends unknown[] = unknown[], TReturn = unknown> = {
  readonly status: TrackStatus;
  readonly pending: boolean;
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly value: TReturn | undefined;
  readonly reason: unknown;
  /** The TrackHandle from the last .run() call, or null before any run. */
  readonly result: TrackHandle<TReturn> | null;
  /** Trigger the mutation with either the declared args or a FormData body. */
  run(...args: TArgs | [FormData]): Promise<TReturn>;
  /** No-op for commands; present for API symmetry. */
  refresh(): void;
};

/**
 * Run a GET remote function immediately and return a reactive TrackHandle.
 */
function trackGet<K extends GetKeys>(
  key: K,
  options?: TrackRemoteOptions,
): TrackHandle<ServerManifestTypes[K]['return']>;
function trackGet<TReturn>(
  fn: RemoteFunction<any[], TReturn, any, any, any>,
  options?: TrackRemoteOptions,
): TrackHandle<TReturn>;
function trackGet<TReturn>(
  fn: (...args: any[]) => Promise<TReturn>,
  options?: TrackRemoteOptions,
): TrackHandle<TReturn>;
function trackGet(
  keyOrFn: string | Function | RemoteFunction<any, any, any, any, any>,
  options?: TrackRemoteOptions,
): TrackHandle<any> {
  // Extract key from: plain string, client-side function stub, or server-side RemoteFunction object.
  // On the client, server exports are function stubs with __auwla_key.
  // On the server (SSR), they are RemoteFunction objects (plain objects) with __auwla_key.
  // This mirrors the same pattern used in trackForm.
  const key =
    (typeof keyOrFn === 'function' || typeof keyOrFn === 'object') &&
    keyOrFn !== null &&
    '__auwla_key' in (keyOrFn as any)
      ? (keyOrFn as any).__auwla_key
      : keyOrFn;
  if (typeof key !== 'string') {
    throw new Error('Auwla: track.get expects a key string or an imported server function reference.');
  }
  const routePath = options?.routePath ?? getCurrentRoutePath();
  const remoteName = `remote:${key}`;

  // If a resolved global query was started on a different route, don't fire
  // a background sync with the current (wrong) route path. Just return the
  // cached handle and let a future call on the original route refresh it.
  const stateKey = makeKey(remoteName, '__global');
  const existing = getRegistry().get(stateKey);
  if (
    existing &&
    existing.statusCell.get() === 'resolved' &&
    existing.routePath &&
    existing.routePath !== routePath
  ) {
    return createHandle(stateKey, existing.promise!) as any;
  }

  // If the entry was pre-seeded by hydrateTrackState (resolved, no routePath,
  // promise already set), return it immediately without dispatching any RPC.
  // The SWR background sync will kick in on the NEXT call (after first render).
  if (
    existing &&
    existing.statusCell.get() === 'resolved' &&
    !existing.routePath &&
    existing.promise
  ) {
    // Tag it with the current route so future calls can sync normally.
    existing.routePath = routePath;
    subscribeSetupComponent(existing.statusCell);
    return createHandle(stateKey, existing.promise) as any;
  }

  const promise = dispatchRpc(key, [], routePath, { ...options, method: 'GET' });
  return trackImpl(remoteName, promise, options, true) as any;
}

/** Invalidate all cached global queries and actively refetch those that are already resolved. */
function invalidateQueryCache(): void {
  for (const [key, state] of getRegistry().entries()) {
    if (key.startsWith('__global::remote:')) {
      state.stale = true;

      if (state.statusCell.get() === 'resolved' && state.routePath) {
        state.stale = false;
        const name = key.slice('__global::remote:'.length);
        const newPromise = dispatchRpc(name, [], state.routePath, { method: 'GET' });

        newPromise.then(
          (value) => {
            if (JSON.stringify(state.value) !== JSON.stringify(value)) {
              applyTransition(key, 'resolved', value);
            }
            state.promise = Promise.resolve(value);
          },
          (reason) => {
            console.error(`Background sync failed for invalidated query "${name}":`, reason);
            applyTransition(key, 'rejected', undefined, reason);
            state.promise = Promise.reject(reason);
          }
        );
      }
    }
  }
}

function createCommandHandle<TArgs extends unknown[], TReturn>(
  key: string,
): CommandHandle<TArgs, TReturn> {
  const resultCell = reactive<TrackHandle<TReturn> | null>(null);
  subscribeSetupComponent(resultCell);

  return {
    get status(): TrackStatus {
      return resultCell.get()?.status ?? 'idle';
    },
    get pending(): boolean {
      return this.status === 'pending';
    },
    get resolved(): boolean {
      return this.status === 'resolved';
    },
    get rejected(): boolean {
      return this.status === 'rejected';
    },
    get value(): TReturn | undefined {
      return resultCell.get()?.value;
    },
    get reason(): unknown {
      return resultCell.get()?.reason;
    },
    get result(): TrackHandle<TReturn> | null {
      return resultCell.get();
    },
    async run(...args: TArgs | [FormData]): Promise<TReturn> {
      const promise = dispatchRpc(key, args, getCurrentRoutePath()) as Promise<TReturn>;
      const handle = trackImpl(`remote:${key}`, promise) as TrackHandle<TReturn>;
      resultCell.set(handle);

      promise.then(() => {
        invalidateQueryCache();
      });

      return promise;
    },
    refresh(): void {
      // Commands do not auto-refresh.
    },
  };
}

/**
 * Create a lazy POST command handle for a remote mutation.
 */
function trackPost<K extends PostKeys>(
  key: K,
): CommandHandle<
  ServerManifestTypes[K]['args'],
  ServerManifestTypes[K]['return']
>;
function trackPost<TArgs extends unknown[], TReturn>(
  fn: RemoteFunction<TArgs, TReturn, any, any, any>,
): CommandHandle<TArgs, TReturn>;
function trackPost<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
): CommandHandle<TArgs, TReturn>;
function trackPost(
  key: string,
): CommandHandle<any[], any>;
function trackPost(
  keyOrFn: string | Function | RemoteFunction<any, any, any, any, any>,
): CommandHandle<any[], any> {
  // On the client, server exports are function stubs with __auwla_key.
  // On the server (SSR), they are RemoteFunction objects (plain objects) with __auwla_key.
  // This mirrors the same pattern used in trackForm.
  const key =
    (typeof keyOrFn === 'function' || typeof keyOrFn === 'object') &&
    keyOrFn !== null &&
    '__auwla_key' in (keyOrFn as any)
      ? (keyOrFn as any).__auwla_key
      : keyOrFn;
  if (typeof key !== 'string') {
    throw new Error('Auwla: track.post expects a key string or an imported server function reference.');
  }
  return createCommandHandle(key);
}

/**
 * Combined track interface: the existing local track primitive plus remote
 * query (track.get) and mutation (track.post) methods.
 */
export interface TrackFn {
  (name: string, promise: Promise<unknown>, options?: TrackOptions): TrackHandle;
  (name: string, fn: (signal: AbortSignal) => Promise<unknown>, options?: TrackOptions): TrackHandle;
  (promise: Promise<unknown>, options?: TrackOptions): TrackHandle;
  /** Run a GET remote function immediately. */
  get: typeof trackGet;
  /** Create a lazy POST command handle. */
  post: typeof trackPost;
  /** Bind a POST remote function to a form. */
  form: typeof trackForm;
}

/**
 * The public track primitive. Use it for local async work, or call
 * track.get() / track.post() for remote server functions.
 */
export const track: TrackFn = Object.assign(trackImpl, {
  get: trackGet,
  post: trackPost,
  form: trackForm,
});

/** @internal Re-export for tests that need the un-augmented function. */
export { trackImpl };
