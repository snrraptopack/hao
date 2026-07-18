/**
 * @fileoverview Express adapter for Auwla fullstack.
 *
 * Mounts the RPC pipeline as Express middleware. Non-RPC requests fall
 * through to `next()`.
 *
 * ```ts
 * import express from 'express'
 * import { createExpressAdapter } from 'auwla/adapters/express'
 * import manifest from './.auwla/server-manifest'
 *
 * const app = express()
 * app.use('/_auwla/rpc', createExpressAdapter({ manifest }))
 * ```
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createFetchAdapter, type FetchAdapterOptions } from './fetch'
import { nodeRequestToRequest, sendNodeResponse } from './node-http'

export type ExpressAdapterOptions = FetchAdapterOptions

export type ExpressNext = (error?: unknown) => void

/**
 * Create Express-compatible middleware that serves the Auwla RPC endpoint.
 * Requests outside the RPC path are passed to `next()`.
 */
export function createExpressAdapter(options: ExpressAdapterOptions = {}) {
  const handle = createFetchAdapter(options)

  return function auwlaExpressMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: ExpressNext,
  ): void {
    nodeRequestToRequest(req)
      .then((request) => handle(request, { express: { req, res } }))
      .then(async (response) => {
        if (!response) return next()
        await sendNodeResponse(res, response)
      })
      .catch(next)
  }
}
