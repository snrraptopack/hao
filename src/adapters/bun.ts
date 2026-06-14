/**
 * @fileoverview Bun.serve adapter for Auwla fullstack.
 *
 * Wraps the WinterCG fetch adapter and returns a 404 for non-RPC requests so
 * Bun can still serve static files when the adapter is used as the default
 * fetch handler.
 */

import { createFetchAdapter, type FetchAdapterOptions } from './fetch'

declare const Bun: {
  file(path: string): any
}

export interface BunAdapterOptions extends FetchAdapterOptions {
  /**
   * Directory to serve static files from. Defaults to './dist'.
   * Pass `null` or `false` to disable static file serving.
   */
  staticDir?: string | null | false
}

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
  const staticDir = options.staticDir !== undefined ? options.staticDir : './dist'

  return async function auwlaBunFetch(request: Request): Promise<Response> {
    // 1. Try the RPC handler first
    const response = await handle(request, { bun: { request } })
    if (response) return response

    // 2. Fall back to serving static files or SPA routing
    if (staticDir) {
      const url = new URL(request.url)
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname
      const file = Bun.file(`${staticDir}${pathname}`)

      if (await file.exists()) {
        return new Response(file)
      }

      // SPA routing fallback: Serve index.html for page requests (e.g. reload on /posts)
      const accept = request.headers.get('accept') ?? ''
      if (accept.includes('text/html')) {
        const indexFile = Bun.file(`${staticDir}/index.html`)
        if (await indexFile.exists()) {
          return new Response(indexFile)
        }
      }
    }

    return new Response('Not found', { status: 404 })
  }
}

