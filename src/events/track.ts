/**
 * @fileoverview Async lifecycle tracking for the Auwla event system.
 *
 * `event.track()` wraps promises and async functions so the framework can
 * observe their lifecycle (pending → resolved/rejected) and auto-commit
 * renders on transitions.
 *
 * The returned handle is THENABLE — you can chain `.then()` just like a
 * normal promise — and has reactive state getters (`.pending`, `.resolved`,
 * `.value`, etc.) that can be read directly in render closures.
 */

import { runtimeState, currentComponentId } from '../runtime/state';
import { commit } from '../runtime/app';

export type TrackStatus = 'idle' | 'pending' | 'resolved' | 'rejected';

export type TrackHandle = {
  readonly name: string;
  readonly status: TrackStatus;
  readonly pending: boolean;
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly value: unknown;
  readonly reason: unknown;
  cancel(): void;
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<unknown | TResult>;
  finally(onfinally?: (() => void) | undefined | null): Promise<unknown>;
};

/** Internal track state stored in the global registry. */
type TrackState = {
  status: TrackStatus;
  value: unknown;
  reason: unknown;
  controller: AbortController | null;
  promise: Promise<unknown> | null;
  // Scoped invalidation: when set, resolving/rejecting this track re-renders
  // only the owning component's subtree instead of every mounted app.
  invalidate?: (ownerId?: string | null) => void;
  ownerId?: string | null;
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
    state = { status: 'idle', value: undefined, reason: undefined, controller: null, promise: null };
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

function transition(key: string, status: TrackStatus, value?: unknown, reason?: unknown) {
  const state = getOrCreate(key);
  state.status = status;
  if (status === 'resolved') state.value = value;
  if (status === 'rejected') state.reason = reason;

  // Prefer a scoped commit so only the owning component's subtree re-renders.
  // Fall back to a global commit for anonymous tracks (no known owner).
  if (state.invalidate && state.ownerId) {
    state.invalidate(state.ownerId);
  } else {
    commit();
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

function createHandle(key: string, promise: Promise<unknown>): TrackHandle {
  const handle = {
    get name() {
      return key.split('::')[1]!;
    },
    get status() {
      return registry.get(key)?.status ?? 'idle';
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
    get value() {
      return registry.get(key)?.value;
    },
    get reason() {
      return registry.get(key)?.reason;
    },
    cancel() {
      const state = registry.get(key);
      if (state?.controller) {
        state.controller.abort();
        state.controller = null;
        state.status = 'idle';
        commit();
      }
    },
    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | undefined | null,
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

  return handle as TrackHandle;
}

function runAsyncTrack(
  key: string,
  fn: (signal: AbortSignal) => Promise<unknown>,
  invalidate?: (ownerId?: string | null) => void,
  ownerId?: string | null,
): Promise<unknown> {
  const state = getOrCreate(key);
  if (state.controller) {
    state.controller.abort();
  }
  const controller = new AbortController();
  state.controller = controller;
  state.status = 'pending';
  // Capture ownership so transition() can do a scoped commit.
  state.invalidate = invalidate;
  state.ownerId = ownerId;

  const promise = fn(controller.signal).then(
    (value) => {
      state.controller = null;
      if (controller.signal.aborted) {
        return undefined;
      }
      transition(key, 'resolved', value);
      return value;
    },
    (reason) => {
      state.controller = null;
      if (controller.signal.aborted) {
        return undefined;
      }
      transition(key, 'rejected', undefined, reason);
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
 * lifecycle state. The handle can be read directly in render closures — no
 * manual `commit()` calls needed.
 */
export function track(name: string, promise: Promise<unknown>): TrackHandle;
export function track(name: string, fn: (signal: AbortSignal) => Promise<unknown>): TrackHandle;
export function track(promise: Promise<unknown>): TrackHandle;
export function track(
  nameOrPromise: string | Promise<unknown>,
  maybePromiseOrFn?: Promise<unknown> | ((signal: AbortSignal) => Promise<unknown>),
): TrackHandle {
  // Overload: track(promise)
  if (typeof nameOrPromise !== 'string') {
    const name = `__auto_${Math.random().toString(36).slice(2)}`;
    const key = makeKey(name);
    const state = getOrCreate(key);
    state.status = 'pending';
    const promise = nameOrPromise.then(
      (value) => {
        transition(key, 'resolved', value);
        return value;
      },
      (reason) => {
        transition(key, 'rejected', undefined, reason);
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
    state.status = 'pending';
    // Capture the active render state's invalidate so the promise path also
    // gets scoped commits when it resolves.
    state.invalidate = runtimeState.activeRenderState?.invalidate;
    state.ownerId = cid;
    const promise = maybePromiseOrFn.then(
      (value) => {
        transition(key, 'resolved', value);
        return value;
      },
      (reason) => {
        transition(key, 'rejected', undefined, reason);
        return undefined;
      },
    );
    state.promise = promise;
    return createHandle(key, promise);
  }

  // Overload: track(name, asyncFn) — starts immediately
  const fn = maybePromiseOrFn as (signal: AbortSignal) => Promise<unknown>;
  // Pass the active render state's invalidate so the async track resolves via
  // a scoped commit rather than a global one.
  const promise = runAsyncTrack(key, fn, runtimeState.activeRenderState?.invalidate, cid);
  return createHandle(key, promise);
}

/** Return whether a named track (or any track if no name given) is pending. */
export function pending(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of registry) {
      if (key.startsWith(`${cid}::`) && state.status === 'pending') return true;
    }
    return false;
  }
  const state = registry.get(makeKey(name));
  return state?.status === 'pending';
}

/** Return whether a named track (or any track if no name given) has resolved. */
export function resolved(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of registry) {
      if (key.startsWith(`${cid}::`) && state.status === 'resolved') return true;
    }
    return false;
  }
  const state = registry.get(makeKey(name));
  return state?.status === 'resolved';
}

/** Return whether a named track (or any track if no name given) has rejected. */
export function rejected(name?: string): boolean {
  if (name === undefined) {
    const cid = getComponentId() ?? '__global';
    for (const [key, state] of registry) {
      if (key.startsWith(`${cid}::`) && state.status === 'rejected') return true;
    }
    return false;
  }
  const state = registry.get(makeKey(name));
  return state?.status === 'rejected';
}

/** Return the resolved value of a named track. */
export function value<T = unknown>(name: string): T | undefined {
  const state = registry.get(makeKey(name));
  return state?.status === 'resolved' ? (state.value as T) : undefined;
}

/** Return the rejection reason of a named track. */
export function reason(name: string): unknown {
  const state = registry.get(makeKey(name));
  return state?.status === 'rejected' ? state.reason : undefined;
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
    state.status = 'idle';
    commit();
  }
}
