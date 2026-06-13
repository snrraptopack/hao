/**
 * @fileoverview Bun.serve adapter for Auwla fullstack.
 *
 * Wraps the WinterCG fetch adapter and returns a 404 for non-RPC requests so
 * Bun can still serve static files when the adapter is used as the default
 * fetch handler.
 */

import { createFetchAdapter, type FetchAdapterOptions } from './fetch'

export type BunAdapterOptions = FetchAdapterOptions

/**
 * Create a fetch handler suitable for `Bun.serve({ fetch })`.
 *
 * Usage:
 *   import { createBunAdapter } from 'auwla/adapters/bun'
 *   import manifest from './.auwla/server-manifest'
 *
 *   Bun.serve({
 *     fetch: createBunAdapter({ manifest }),
 *   })
 */
export function createBunAdapter(options: BunAdapterOptions) {
  const handle = createFetchAdapter(options)

  return async function auwlaBunFetch(request: Request): Promise<Response> {
    const response = await handle(request)
    return response ?? new Response('Not found', { status: 404 })
  }
}
