/**
 * @fileoverview Express adapter for Auwla fullstack.
 *
 * Express handlers receive `req`/`res` objects rather than a WinterCG
 * `Request`/`Response`, so this adapter needs shims that:
 *   - build a `Request` from `req` (including the raw body)
 *   - copy the returned `Response` headers/status/body back to `res`
 *
 * Express commonly consumes the request stream with body-parser middleware,
 * which makes reading the raw body unreliable. Because of that, this adapter
 * is intentionally deferred until after the fetch/Hono/Bun adapters are
 * stable.
 *
 * When implemented, usage will look like:
 *   import express from 'express'
 *   import { createExpressAdapter } from 'auwla/adapters/express'
 *   import manifest from './.auwla/server-manifest'
 *
 *   const app = express()
 *   app.post('/_auwla/rpc', createExpressAdapter({ manifest }))
 */

import type { FetchAdapterOptions } from './fetch'

export type ExpressAdapterOptions = FetchAdapterOptions

/**
 * Placeholder for the Express adapter.
 *
 * Throws a clear error at runtime because the shim layer is not yet
 * implemented. Use `createFetchAdapter` or `createHonoAdapter` instead.
 */
export function createExpressAdapter(_options: ExpressAdapterOptions): never {
  throw new Error(
    '[auwla/adapters/express] The Express adapter is not implemented yet. ' +
      'Use createFetchAdapter or createHonoAdapter for now.',
  )
}
