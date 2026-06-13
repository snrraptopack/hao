/**
 * @fileoverview Hono adapter for Auwla fullstack.
 *
 * Thin wrapper around the WinterCG fetch adapter. Mount it on the RPC path
 * and it handles serialization, route param extraction, and middleware.
 *
 * No runtime dependency on Hono is introduced; only structural typing is used.
 */

import { createFetchAdapter, type FetchAdapterOptions } from './fetch'

export type HonoAdapterOptions = FetchAdapterOptions

/** Minimal Hono context shape needed by the adapter. */
export type HonoContext = {
  req: { raw: Request }
  next(): Promise<void>
}

/** Hono middleware signature, structurally compatible with Hono's own type. */
export type HonoMiddlewareHandler = (
  c: HonoContext,
) => Response | Promise<Response> | void | Promise<void> | Promise<Response | void>

/**
 * Create a Hono middleware that serves Auwla RPC.
 *
 * Usage:
 *   import { Hono } from 'hono'
 *   import { createHonoAdapter } from 'auwla/adapters/hono'
 *   import manifest from './.auwla/server-manifest'
 *
 *   const app = new Hono()
 *   app.use('/_auwla/rpc', createHonoAdapter({ manifest }))
 */
export function createHonoAdapter(options: HonoAdapterOptions): HonoMiddlewareHandler {
  const handle = createFetchAdapter(options)

  return async function auwlaHonoMiddleware(c) {
    const response = await handle(c.req.raw)
    if (response) return response
    return c.next()
  }
}
