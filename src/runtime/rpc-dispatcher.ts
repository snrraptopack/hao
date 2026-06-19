/**
 * @fileoverview Injectable RPC dispatcher for `track.get` / `track.post`.
 *
 * The browser sets the default dispatcher to `rpcCall` (fetch). During SSR the
 * server injects a dispatcher that invokes the server function directly so no
 * network round-trip is needed.
 */

import type { RpcOptions } from '../client/rpc';

export type RpcDispatcher = (
  key: string,
  args: unknown[],
  routePath: string,
  options?: RpcOptions & { method?: 'GET' | 'POST' },
) => Promise<unknown>;

let _dispatcher: RpcDispatcher | null = null;

/**
 * Set the active RPC dispatcher. Call once on the client and once per request
 * on the server.
 */
export function setRpcDispatcher(dispatcher: RpcDispatcher): void {
  _dispatcher = dispatcher;
}

/**
 * Clear the dispatcher. Mostly useful for tests.
 */
export function clearRpcDispatcher(): void {
  _dispatcher = null;
}

/**
 * Get the active RPC dispatcher, or null if none has been set.
 */
export function getRpcDispatcher(): RpcDispatcher | null {
  return _dispatcher;
}
