/**
 * @fileoverview Hono adapter for Auwla fullstack.
 *
 * Provides a Hono middleware that automatically handles RPC endpoints and
 * server-side rendering (SSR), compatible with both native node/bun runtimes
 * and edge platforms like Cloudflare Workers.
 */

import { createFetchAdapter, type FetchAdapterOptions } from './fetch'
import { ssrRender } from './shared'
import type { Route } from '../router/types'
import type { SsrInvokeOptions } from '../server/ssr-invoke'

export interface HonoAdapterOptions extends FetchAdapterOptions {
  /**
   * Directory to serve static files from (when running on server platforms).
   * Defaults to `'./dist'`. Pass `null` or `false` to disable file system template loading.
   */
  staticDir?: string | null | false

  /**
   * Route table used for SSR page rendering. If omitted, will attempt to lazy load
   * from virtual module 'auwla:routes' at runtime.
   */
  routes?: Route[]

  /**
   * Raw HTML template shell string. If provided, edge platforms can render SSR
   * pages directly without reading from the file system.
   */
  template?: string

  /**
   * Path to the HTML shell template. Defaults to `<staticDir>/index.html`.
   */
  templatePath?: string

  /**
   * Global server middlewares applied during SSR.
   */
  globalMiddlewares?: SsrInvokeOptions['globalMiddlewares']
}

/** Minimal Hono context shape needed by the adapter. */
export type HonoContext = {
  req: { raw: Request }
}

/** Hono middleware signature, structurally compatible with Hono's own type. */
export type HonoMiddlewareHandler = (
  c: HonoContext,
  next: () => Promise<void>
) => Promise<void | Response>

/**
 * Create a Hono middleware that serves Auwla RPC and SSR page rendering.
 *
 * Usage:
 *   import { Hono } from 'hono'
 *   import { createHonoAdapter } from 'auwla/adapters/hono'
 *
 *   const app = new Hono()
 *   // Zero-config: auto-resolves routes, manifest, and template in Node/Bun.
 *   app.use('*', createHonoAdapter())
 */
export function createHonoAdapter(options: HonoAdapterOptions = {}): HonoMiddlewareHandler {
  const handle = createFetchAdapter(options)
  const staticDir = options.staticDir !== undefined ? options.staticDir : './dist'

  return async function auwlaHonoMiddleware(c, next) {
    const request = c.req.raw

    // 1. RPC Handler
    const rpcResponse = await handle(request, { hono: c })
    if (rpcResponse) return rpcResponse

    // 2. SSR Page Rendering (only for HTML requests)
    const acceptsHtml = (request.headers.get('accept') ?? '').includes('text/html')
    if (acceptsHtml) {
      let routes = options.routes
      if (!routes) {
        try {
          routes = (await import('auwla:routes')).default
        } catch (err) {}
      }
      let manifest = options.manifest
      if (!manifest) {
        try {
          manifest = (await import('auwla:server-manifest')).default
        } catch (err) {}
      }

      if (routes && manifest) {
        try {
          const ssrResponse = await ssrRender(request, { ...options, routes, manifest }, staticDir as string)
          if (ssrResponse) return ssrResponse
        } catch (e) {
          console.error('[auwla] SSR render failed in Hono adapter:', e)
        }
      }
    }

    return next()
  }
}
