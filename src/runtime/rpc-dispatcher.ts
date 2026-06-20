/**
 * @fileoverview Injectable RPC dispatcher for `track.get` / `track.post`.
 *
 * The browser sets the default dispatcher to `rpcCall` (fetch). During SSR the
 * server injects a dispatcher that invokes the server function directly so no
 * network round-trip is needed.
 *
 * ### Per-request isolation
 * In an SSR environment, concurrent requests must each have their own
 * dispatcher so that one request's context cannot leak into another. The
 * `ssr.ts` module sets `globalThis.__auwla_rpcDispatcherProvider` to an object
 * whose `get/set/clear` methods read/write the AsyncLocalStorage store for the
 * current request. This file checks that provider first on every call, falling
 * back to the module-level variable on the client where ALS is not used.
 */

import type { RpcOptions } from '../client/rpc';

export type RpcDispatcher = (
  key: string,
  args: unknown[],
  routePath: string,
  options?: RpcOptions & { method?: 'GET' | 'POST' },
) => Promise<unknown>;

/**
 * Provider interface set by `ssr.ts` to give per-request (ALS-backed)
 * get/set/clear semantics during SSR.
 */
export interface RpcDispatcherProvider {
  get(): RpcDispatcher | null;
  set(dispatcher: RpcDispatcher): void;
  clear(): void;
}

/** Module-level fallback for client-side use (no ALS available). */
let _dispatcher: RpcDispatcher | null = null;

/** Returns the ALS-backed provider if one has been registered (SSR), else null. */
function getProvider(): RpcDispatcherProvider | null {
  return (globalThis as any).__auwla_rpcDispatcherProvider ?? null;
}

/**
 * Set the active RPC dispatcher.
 * On the server this writes into the current request's ALS store.
 * On the client this sets the module-level variable.
 */
export function setRpcDispatcher(dispatcher: RpcDispatcher): void {
  const provider = getProvider();
  if (provider) {
    provider.set(dispatcher);
    return;
  }
  _dispatcher = dispatcher;
}

/**
 * Clear the active RPC dispatcher.
 * On the server this clears the current request's ALS entry.
 * On the client this nulls the module-level variable.
 */
export function clearRpcDispatcher(): void {
  const provider = getProvider();
  if (provider) {
    provider.clear();
    return;
  }
  _dispatcher = null;
}

/**
 * Get the active RPC dispatcher, or null if none has been set.
 * On the server this reads from the current request's ALS store.
 * On the client this returns the module-level variable.
 */
export function getRpcDispatcher(): RpcDispatcher | null {
  const provider = getProvider();
  if (provider) {
    return provider.get();
  }
  return _dispatcher;
}
