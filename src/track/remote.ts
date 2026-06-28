import { reactive } from '../runtime/reactive';
import { rpcCall, getCurrentRoutePath } from '../client/rpc';
import { getRpcDispatcher } from '../runtime/rpc-dispatcher';
import type { ServerManifestTypes } from 'auwla/server-manifest';
import type { RemoteFunction } from '../server/types';
import {
  TrackStatus,
  TrackHandle,
  CommandHandle,
  TrackRemoteOptions,
  getRegistry,
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
): TrackHandle<ServerManifestTypes[K]['return']>;
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
  const remoteName = `remote:${key}:${routePath}`;

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
