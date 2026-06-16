/**
 * @fileoverview Minimal bridge for the client-side RPC dispatcher to use a
 * server-side invoker during SSR.
 *
 * This module intentionally has no server-only dependencies so it is safe to
 * import from the client bundle.
 */

export type SsrRpcInvoker = (
  key: string,
  args: unknown[],
  routePath: string,
) => Promise<unknown>

export interface SsrContext {
  request: Request;
  invoker: SsrRpcInvoker;
  pending: Set<Promise<unknown>>;
  track<T>(promise: Promise<T>): Promise<T>;
}

let _ssrContext: SsrContext | null = null

/**
 * Install the server-side SSR context. Called once per SSR request by the
 * render loop so `track.get()` / `track.post()` can resolve locally and the
 * renderer can wait for async server functions to settle.
 */
export function setSsrContext(ctx: SsrContext | null): void {
  _ssrContext = ctx
}

/** @internal Read the currently installed SSR context, if any. */
export function getSsrContext(): SsrContext | null {
  return _ssrContext
}
