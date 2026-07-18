import { reactive } from '../runtime/reactive';
import { rpcCall, getCurrentRoutePath, getCurrentRouteParams } from '../client/rpc';
import { getRpcDispatcher } from '../runtime/rpc-dispatcher';
import { deepEqual } from '../shared/deep-equal';
import type { ServerManifestTypes } from 'auwla/server-manifest';
import type { RemoteFunction } from '../server/types';
import {
  TrackStatus,
  TrackHandle,
  CommandHandle,
  TrackRemoteOptions,
  getRegistry,
  getOrCreate,
  makeKey,
  createHandle,
  subscribeSetupComponent,
  applyTransition,
  trackImpl,
} from './core';

type GetKeys = {
  [K in keyof ServerManifestTypes]: ServerManifestTypes[K] extends { method: 'GET' }
    ? K
    : never;
}[keyof ServerManifestTypes];

type PostKeys = {
  [K in keyof ServerManifestTypes]: ServerManifestTypes[K] extends { method: 'POST' }
    ? K
    : never;
}[keyof ServerManifestTypes];

type ReturnType<K extends keyof ServerManifestTypes> = ServerManifestTypes[K] extends {
  return: infer R;
}
  ? R
  : never;

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

/**
 * Run a GET remote function immediately and return a reactive TrackHandle.
 */
export function trackGet<K extends GetKeys>(
  key: K,
  options?: TrackRemoteOptions,
): TrackHandle<ReturnType<K>>;
export function trackGet<TReturn>(
  fn: RemoteFunction<any[], TReturn, any, any, any>,
  options?: TrackRemoteOptions,
): TrackHandle<TReturn>;
export function trackGet<TReturn>(
  fn: (...args: any[]) => Promise<TReturn>,
  options?: TrackRemoteOptions,
): TrackHandle<TReturn>;
export function trackGet(
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

  let remoteName = `remote:${key}`;
  const namespace = options?.global ? '__global' : (options?.id ? `id:${options.id}` : routePath);

  // Append route params to the name so different resource IDs have distinct cache entries.
  // We skip this for global (app-wide) queries since they have no route scope.
  if (!options?.global) {
    const params = getCurrentRouteParams();
    const sortedKeys = Object.keys(params).sort();
    if (sortedKeys.length > 0) {
      const paramValues = sortedKeys.map(k => params[k]).join(':');
      remoteName = `remote:${key}:${paramValues}`;
    }
  }

  const stateKey = makeKey(remoteName, namespace);
  const existing = getRegistry().get(stateKey);

  // 1. Deduplicate: if a request for this exact key is already in-flight, return
  // the same promise — no new network request is fired. This is the fix for the
  // race condition where multiple components render synchronously and all call
  // dispatchRpc before any of them has stored the pending promise in the registry.
  if (existing && existing.statusCell.get() === 'pending' && existing.promise) {
    subscribeSetupComponent(existing.statusCell);
    return createHandle(stateKey, existing.promise) as any;
  }

  // 2. Resolved from a different route — return as-is, skip background sync.
  if (
    existing &&
    existing.statusCell.get() === 'resolved' &&
    existing.routePath &&
    existing.routePath !== routePath
  ) {
    subscribeSetupComponent(existing.statusCell);
    return createHandle(stateKey, existing.promise!) as any;
  }

  // 3. Pre-seeded by hydrateTrackState (resolved, no routePath): return immediately.
  // The SWR background sync will kick in on the NEXT render after first paint.
  if (
    existing &&
    existing.statusCell.get() === 'resolved' &&
    !existing.routePath &&
    existing.promise
  ) {
    existing.routePath = routePath;
    subscribeSetupComponent(existing.statusCell);
    return createHandle(stateKey, existing.promise) as any;
  }

  // 4. SSR hydration fallback: when not using global/id mode, the namespace is routePath
  // but hydrateTrackState always seeds under __global::. Check there as a fallback so
  // a page rendered server-side can hydrate without the caller needing global: true.
  if (!options?.global && !options?.id) {
    const globalKey = makeKey(remoteName, '__global');
    const globalEntry = getRegistry().get(globalKey);
    if (
      globalEntry &&
      globalEntry.statusCell.get() === 'resolved' &&
      globalEntry.promise
    ) {
      // Migrate the hydrated entry into the routePath namespace so subsequent
      // calls on this route use the correct key and SWR can sync properly.
      const state = getOrCreate(stateKey);
      state.statusCell = globalEntry.statusCell;
      state.value = globalEntry.value;
      state.promise = globalEntry.promise;
      state.routePath = routePath;
      // Remove the __global entry to avoid double-caching.
      getRegistry().delete(globalKey);
      subscribeSetupComponent(state.statusCell);
      return createHandle(stateKey, state.promise) as any;
    }
  }

  // 5. Stale-While-Revalidate: already resolved on this route/namespace.
  // Return cached data immediately and schedule a background sync.
  if (existing && existing.statusCell.get() === 'resolved' && existing.promise) {
    subscribeSetupComponent(existing.statusCell);

    if (!options?.skipBackgroundSync) {
      const bgPromise = dispatchRpc(key, [], routePath, { ...options, method: 'GET' });
      bgPromise.then(
        (value) => {
          if (!deepEqual(existing.value, value)) {
            applyTransition(stateKey, 'resolved', value, undefined, options);
          }
          existing.promise = Promise.resolve(value);
        },
        (reason) => {
          console.error(`[auwla] Background sync failed for "${remoteName}":`, reason);
          applyTransition(stateKey, 'rejected', undefined, reason, options);
          existing.promise = Promise.reject(reason);
        }
      );
    }
    return createHandle(stateKey, existing.promise) as any;
  }


  // 6. Cold start: seed the registry with a pending state BEFORE firing dispatchRpc
  // so that any concurrent calls that arrive before the first microtask tick will
  // hit check #1 above and share this same promise instead of firing their own requests.
  const state = getOrCreate(stateKey);
  state.statusCell = reactive<TrackStatus>('pending');
  state.routePath = routePath;

  const promise = dispatchRpc(key, [], routePath, { ...options, method: 'GET' });

  const tracked = promise.then(
    (value) => {
      applyTransition(stateKey, 'resolved', value, undefined, options);
      return value;
    },
    (reason) => {
      // Mark the handle as rejected for reactive component use (.rejected / .reason).
      // Re-throw so that `await track.get()` in a routed loader propagates the
      // error naturally — the Router catches it and renders the errorComponent.
      applyTransition(stateKey, 'rejected', undefined, reason, options);
      throw reason;
    },
  );
  state.promise = tracked;
  subscribeSetupComponent(state.statusCell);
  return createHandle(stateKey, tracked) as any;
}

/** Invalidate all cached global queries and actively refetch those that are already resolved. */
export function invalidateQueryCache(): void {
  for (const [key, state] of getRegistry().entries()) {
    if (key.startsWith('__global::remote:')) {
      state.stale = true;

      if (state.statusCell.get() === 'resolved' && state.routePath) {
        state.stale = false;
        const rawName = key.slice('__global::remote:'.length);
        const colonIndex = rawName.indexOf(':');
        const name = colonIndex === -1 ? rawName : rawName.substring(0, colonIndex);
        const newPromise = dispatchRpc(name, [], state.routePath, { method: 'GET' });

        newPromise.then(
          (value) => {
            if (!deepEqual(state.value, value)) {
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

export function createCommandHandle<TArgs extends unknown[], TReturn>(
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
export function trackPost<K extends PostKeys>(
  key: K,
): CommandHandle<
  ServerManifestTypes[K]['args'],
  ServerManifestTypes[K]['return']
>;
export function trackPost<TArgs extends unknown[], TReturn>(
  fn: RemoteFunction<TArgs, TReturn, any, any, any>,
): CommandHandle<TArgs, TReturn>;
export function trackPost<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
): CommandHandle<TArgs, TReturn>;
export function trackPost(
  key: string,
): CommandHandle<any[], any>;
export function trackPost(
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
