/**
 * @fileoverview TrackHandle factory and the `track()` implementation.
 *
 * `track()` wraps promises and async functions so the framework can observe
 * their lifecycle (pending → resolved/rejected) and re-render subscribed
 * components automatically. The returned handle is THENABLE and has reactive
 * state getters readable directly in render closures.
 */

import { reactive } from '../runtime/reactive';
import { deepEqual } from '../shared/deep-equal';
import { getCurrentRoutePath } from '../client/rpc';
import {
  applyTransition,
  cancelTrackState,
  getComponentId,
  getOrCreate,
  getRegistry,
  makeKey,
  registerForComponent,
  subscribeSetupComponent,
} from './registry';
import type { TrackHandle, TrackOptions, TrackStatus } from './registry';

export function createHandle<T = unknown>(key: string, promise: Promise<T>): TrackHandle<T> {
  // Attach a no-op catch so that if the caller only reads reactive state
  // (.rejected / .reason) without ever awaiting the handle, the runtime
  // does not surface an "unhandled rejection" warning. This does NOT swallow
  // the error — `await handle` still re-throws because .then() delegates to
  // the original promise before this catch runs.
  promise.catch(() => {});

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
      cancelTrackState(getRegistry().get(key));
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
  // Bump the run token so settle callbacks from any previous run (including
  // promise-overload runs, which have no controller) become no-ops.
  const token = ++state.token;
  // Replace the cell with a fresh instance so stale subscribers from a
  // previous run (e.g. a PostList rendered during an earlier navigation) are
  // NOT notified by this 'pending' transition — they subscribed to the OLD
  // cell and must not interfere with the new async lifecycle. The Router will
  // subscribe to this new cell when it reads cachedLoader.status after track()
  // returns, which is always within the same synchronous render pass.
  state.statusCell = reactive<TrackStatus>('pending');

  const promise = fn(controller.signal).then(
    (value) => {
      // B8: when this (aborted) run settles late, a NEWER run may already own
      // the state. Only clear the controller and apply the transition if this
      // callback's own controller is still the installed one — otherwise we
      // would wipe the new run's controller and break handle.cancel().
      if (state.token !== token || state.controller !== controller) {
        return value;
      }
      state.controller = null;
      if (controller.signal.aborted) {
        return undefined;
      }
      applyTransition(key, 'resolved', value, undefined, options);
      return value;
    },
    (reason) => {
      if (state.token !== token || state.controller !== controller) {
        return undefined;
      }
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
export function trackImpl(name: string, promise: Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
export function trackImpl(name: string, fn: (signal: AbortSignal) => Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
export function trackImpl(promise: Promise<unknown>, options?: TrackOptions, isGlobal?: boolean): TrackHandle;
export function trackImpl(
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
    const token = ++state.token;
    const promise = nameOrPromise.then(
      (value) => {
        // Skip the transition if this run was cancelled before settling.
        if (state.token !== token) return value;
        applyTransition(key, 'resolved', value, undefined, options);
        return value;
      },
      (reason) => {
        if (state.token !== token) return undefined;
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
              if (!deepEqual(state.value, value)) {
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
    // B9: bump the per-key run token. Settle callbacks below only apply their
    // transition while this token is still current, so a stale promise that
    // settles after a same-name re-track (or after cancel()) cannot overwrite
    // the fresh run's state.
    const token = ++state.token;
    const promise = (maybePromiseOrFn as Promise<unknown>).then(
      (value) => {
        if (state.token !== token) return value;
        applyTransition(key, 'resolved', value, undefined, options);
        return value;
      },
      (reason) => {
        // Mark the handle as rejected for reactive component use (.rejected / .reason).
        // Re-throw so that `await track.get()` in a routed loader propagates the
        // error naturally — the Router catches it and renders the errorComponent.
        // A stale run still rejects its own returned promise; it just must not
        // touch the newer run's state.
        if (state.token !== token) throw reason;
        applyTransition(key, 'rejected', undefined, reason, options);
        throw reason;
      },
    );
    state.promise = promise;
    subscribeSetupComponent(state.statusCell);
    return createHandle(key, promise);
  }

  // Overload: track(name, asyncFn) — starts immediately with AbortSignal
  const fn = maybePromiseOrFn as (signal: AbortSignal) => Promise<unknown>;

  const stateKey = key;
  const existing = getRegistry().get(stateKey);
  // Serve a resolved global entry without re-running ONLY when it was seeded
  // by hydrateTrackState (SSR payload) — such entries have no routePath yet.
  // Entries produced by a real run always carry a routePath (stamped below),
  // so every fresh track() call with an asyncFn re-runs the loader (B13:
  // previously the 2nd visit to a route silently served stale data and only
  // the 3rd re-ran).
  if (
    isGlobal &&
    existing &&
    existing.statusCell.get() === 'resolved' &&
    !existing.routePath &&
    existing.promise
  ) {
    existing.routePath = getCurrentRoutePath();
    subscribeSetupComponent(existing.statusCell);
    return createHandle(stateKey, existing.promise);
  }

  if (isGlobal) {
    // Mark this entry as produced by a real run so the hydration fast-path
    // above never mistakes it for an SSR-seeded entry on the next visit.
    const runState = getOrCreate(key);
    if (!runState.routePath) {
      runState.routePath = getCurrentRoutePath();
    }
  }

  const promise = runAsyncTrack(key, fn, options);
  subscribeSetupComponent(getOrCreate(key).statusCell);
  return createHandle(key, promise);
}
