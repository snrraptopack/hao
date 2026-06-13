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
import type { ServerManifestTypes } from 'auwla/server-manifest';

export type TrackStatus = 'idle' | 'pending' | 'resolved' | 'rejected';

export type TrackOptions = {
  viewTransition?: boolean;
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
};

/** Global track registry keyed by `${componentId}::${name}`. */
const registry = new Map<string, TrackState>();

/** Tracks created by a given component (for bulk cancel on unmount). */
const componentTracks = new Map<string, Set<string>>();

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
  let state = registry.get(key);
  if (!state) {
    state = {
      statusCell: reactive<TrackStatus>('idle'),
      value: undefined,
      reason: undefined,
      controller: null,
      promise: null,
    };
    registry.set(key, state);
  }
  return state;
}

function registerForComponent(componentId: string, name: string) {
  let set = componentTracks.get(componentId);
  if (!set) {
    set = new Set();
    componentTracks.set(componentId, set);
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
  state.statusCell.set(status);
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
  const names = componentTracks.get(componentId);
  if (!names) return;
  for (const name of names) {
    const key = `${componentId}::${name}`;
    const state = registry.get(key);
    if (state?.controller) {
      state.controller.abort();
    }
    registry.delete(key);
  }
  componentTracks.delete(componentId);
}

/** @internal Reset the track registry. Used by tests and HMR to avoid stale state. */
export function __resetTrackRegistry(): void {
  for (const state of registry.values()) {
    if (state.controller) {
      state.controller.abort();
    }
  }
  registry.clear();
  componentTracks.clear();
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
      return registry.get(key)?.statusCell.get() ?? 'idle';
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
      return registry.get(key)?.value as T | undefined;
    },
    get reason() {
      return registry.get(key)?.reason;
    },
    cancel() {
      const state = registry.get(key);
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
function trackImpl(name: string, promise: Promise<unknown>, options?: TrackOptions): TrackHandle;
function trackImpl(name: string, fn: (signal: AbortSignal) => Promise<unknown>, options?: TrackOptions): TrackHandle;
function trackImpl(promise: Promise<unknown>, options?: TrackOptions): TrackHandle;
function trackImpl(
  nameOrPromise: string | Promise<unknown>,
  maybePromiseOrFnOrOptions?: Promise<unknown> | ((signal: AbortSignal) => Promise<unknown>) | TrackOptions,
  maybeOptions?: TrackOptions,
): TrackHandle {
  let options: TrackOptions | undefined;
  let maybePromiseOrFn: Promise<unknown> | ((signal: AbortSignal) => Promise<unknown>) | undefined;

  if (typeof nameOrPromise !== 'string') {
    options = maybePromiseOrFnOrOptions as TrackOptions | undefined;
  } else {
    maybePromiseOrFn = maybePromiseOrFnOrOptions as any;
    options = maybeOptions;
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
    return createHandle(key, promise);
  }

  const name = nameOrPromise;
  const cid = getComponentId();
  const key = makeKey(name, cid);
  if (cid) registerForComponent(cid, name);

  // Overload: track(name, promise)
  if (maybePromiseOrFn && typeof maybePromiseOrFn === 'object' && 'then' in maybePromiseOrFn) {
    const state = getOrCreate(key);
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
    return createHandle(key, promise);
  }

  // Overload: track(name, asyncFn) — starts immediately with AbortSignal
  const fn = maybePromiseOrFn as (signal: AbortSignal) => Promise<unknown>;
  const promise = runAsyncTrack(key, fn, options);
  return createHandle(key, promise);
}

/** Return whether a named track (or any track if no name given) is pending. */
export function pending(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of registry) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'pending') return true;
    }
    return false;
  }
  const state = registry.get(makeKey(name));
  return state?.statusCell.get() === 'pending';
}

/** Return whether a named track (or any track if no name given) has resolved. */
export function resolved(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of registry) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'resolved') return true;
    }
    return false;
  }
  const state = registry.get(makeKey(name));
  return state?.statusCell.get() === 'resolved';
}

/** Return whether a named track (or any track if no name given) has rejected. */
export function rejected(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of registry) {
      if (key.startsWith(`${cid}::`) && state.statusCell.get() === 'rejected') return true;
    }
    return false;
  }
  const state = registry.get(makeKey(name));
  return state?.statusCell.get() === 'rejected';
}

/** Return the resolved value of a named track. */
export function value<T = unknown>(name: string): T | undefined {
  const state = registry.get(makeKey(name));
  return state?.statusCell.get() === 'resolved' ? (state.value as T) : undefined;
}

/** Return the rejection reason of a named track. */
export function reason(name: string): unknown {
  const state = registry.get(makeKey(name));
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
  const state = registry.get(key);
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

export type TrackRemoteOptions = {
  signal?: AbortSignal;
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
): TrackHandle<ServerManifestTypes[K]['return']> {
  const promise = rpcCall(key, [], getCurrentRoutePath(), options) as Promise<
    ServerManifestTypes[K]['return']
  >;
  return trackImpl(`remote:${key}`, promise) as TrackHandle<ServerManifestTypes[K]['return']>;
}

function createCommandHandle<TArgs extends unknown[], TReturn>(
  key: string,
): CommandHandle<TArgs, TReturn> {
  const resultCell = reactive<TrackHandle<TReturn> | null>(null);

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
      const promise = rpcCall(key, args, getCurrentRoutePath()) as Promise<TReturn>;
      const handle = trackImpl(`remote:${key}`, promise) as TrackHandle<TReturn>;
      resultCell.set(handle);
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
> {
  return createCommandHandle<
    ServerManifestTypes[K]['args'],
    ServerManifestTypes[K]['return']
  >(key);
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
}

/**
 * The public track primitive. Use it for local async work, or call
 * track.get() / track.post() for remote server functions.
 */
export const track: TrackFn = Object.assign(trackImpl, {
  get: trackGet,
  post: trackPost,
});

/** @internal Re-export for tests that need the un-augmented function. */
export { trackImpl };
