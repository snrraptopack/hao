/**
 * @fileoverview Bun.serve adapter for Auwla fullstack.
 *
 * Wraps the WinterCG fetch adapter and extends it with optional SSR rendering
 * so a single `Bun.serve` call handles RPC, server-side rendering, and static
 * file serving — no separate server entry required.
 *
 * ### Minimal setup (RPC + static)
 * ```ts
 * import { createBunAdapter } from 'auwla/adapters/bun'
 * import manifest from './.auwla/server-manifest'
 *
 * Bun.serve({ fetch: createBunAdapter({ manifest }) })
 * ```
 *
 * ### Full-stack setup (RPC + SSR + static)
 * ```ts
 * import { createBunAdapter } from 'auwla/adapters/bun'
 * import manifest from './.auwla/server-manifest'
 * import routes  from 'auwla:routes'
 *
 * Bun.serve({
 *   fetch: createBunAdapter({
 *     manifest,
 *     routes,
 *     // Optional: path to your HTML shell. Defaults to `<staticDir>/index.html`.
 *     // Must contain `<!--app-html-->` where the rendered markup is injected,
 *     // and the app root element must have `data-auwla-ssr` for hydration.
 *     templatePath: './dist/index.html',
 *   }),
 * })
 * ```
 */

import { createFetchAdapter, type FetchAdapterOptions } from './fetch'
import { renderToString } from '../runtime/ssr'
import type { Route } from '../router/types'
import type { SsrInvokeOptions } from '../server/ssr-invoke'

declare const Bun: {
  /**
   * Returns a BunFile handle. BunFile extends Blob in the real Bun runtime,
   * so it is valid as a `Response` body. We declare the Blob-compatible subset
   * we need here to avoid importing Bun-specific types into the library.
   */
  file(path: string): Blob & { text(): Promise<string>; exists(): Promise<boolean> }
}

export interface BunAdapterOptions extends FetchAdapterOptions {
  /**
   * Directory to serve static files from. Defaults to `'./dist'`.
   * Pass `null` or `false` to disable static file serving.
   */
  staticDir?: string | null | false

  /**
   * Route table used for SSR page rendering.
   *
   * When provided, HTML page requests that do not match the RPC path are
   * rendered server-side before the static-file fallback. If omitted, the
   * adapter behaves like a pure SPA server (static files only).
   */
  routes?: Route[]

  /**
   * Path to the HTML shell template.
   *
   * The template must contain `<!--app-html-->` where the rendered component
   * HTML is injected, and the app root element must carry `data-auwla-ssr`
   * so the client-side hydration cursor activates on first paint.
   *
   * Defaults to `<staticDir>/index.html`.
   */
  templatePath?: string

  /**
   * Global server middlewares applied to every remote function invocation
   * during SSR. Passed through to `renderToString`.
   */
  globalMiddlewares?: SsrInvokeOptions['globalMiddlewares']
}

// ─── internal helpers ────────────────────────────────────────────────────────

const templateCache = new Map<string, string>()

async function readTemplate(path: string): Promise<string | null> {
  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  if (!isDev) {
    const cached = templateCache.get(path)
    if (cached) return cached
  }

  let text: string
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(path)
    if (!(await file.exists())) return null
    text = await file.text()
  } else {
    try {
      // @ts-ignore
      const fs = await import('fs')
      text = await fs.promises.readFile(path, 'utf-8')
    } catch {
      return null
    }
  }

  if (!isDev) {
    templateCache.set(path, text)
  }
  return text
}

/**
 * Attempt to SSR-render a page for the given request URL.
 *
 * Returns `null` when:
 *  - no routes are configured,
 *  - the HTML shell template cannot be found, OR
 *  - the URL does not match any route (404 routes are still rendered).
 */
async function ssrRender(
  request: Request,
  options: BunAdapterOptions,
  staticDir: string,
): Promise<Response | null> {
  const { routes, manifest, globalMiddlewares, load } = options
  if (!routes || !manifest) return null

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  const defaultTemplatePath = isDev ? './index.html' : `${staticDir}/index.html`
  const templatePath = options.templatePath ?? defaultTemplatePath
  
  const template = await readTemplate(templatePath)
  if (!template) {
    return new Response('Not Found: index.html missing', { status: 404 })
  }

  const result = await renderToString(request.url, routes, {
    manifest: manifest as any,
    request,
    globalMiddlewares,
    load,
  })

  if (result.redirect) {
    return Response.redirect(result.redirect, 302)
  }

  if (result.status === 403) {
    return new Response(result.html, {
      status: 403,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  if (!result.matched) {
    return new Response('Not Found', { status: 404 })
  }

  // Mark the #app root with data-auwla-ssr so the client runtime knows SSR
  // content is present and can hydrate instead of wiping the DOM on mount.
  const page = template
    .replace('id="app"', 'id="app" data-auwla-ssr="true"')
    .replace('<!--app-html-->', result.html)

  return new Response(page, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

// ─── public factory ──────────────────────────────────────────────────────────

/**
 * Create a fetch handler suitable for `Bun.serve({ fetch })`.
 *
 * The handler checks requests in this order:
 *  1. **RPC** — any request to the RPC endpoint (`/_auwla/rpc` by default).
 *  2. **SSR** — `text/html` requests when `routes` is provided; renders the
 *               matching route to a string and injects it into the HTML shell.
 *  3. **Static** — serves files from `staticDir` (`./dist` by default).
 *  4. **SPA fallback** — returns `index.html` for unmatched `text/html` requests
 *                        so client-side routing works on hard reload.
 *  5. **404** — everything else.
 */
export function createBunAdapter(options: BunAdapterOptions = {}) {
  const handle = createFetchAdapter(options)
  const staticDir = options.staticDir !== undefined ? options.staticDir : './dist'

  return async function auwlaBunFetch(request: Request): Promise<Response> {
    // 1. RPC
    const rpcResponse = await handle(request, { bun: { request } })
    if (rpcResponse) return rpcResponse

    // 2. SSR page rendering (only for HTML requests)
    const acceptsHtml = (request.headers.get('accept') ?? '').includes('text/html')
    if (acceptsHtml && staticDir) {
      if (!options.routes) {
        try {
          options.routes = (await import('auwla:routes')).default
        } catch (err) {
          // It's ok if routes aren't available, we just fall back to SPA shell
        }
      }
      if (!options.manifest) {
        try {
          options.manifest = (await import('auwla:server-manifest')).default
        } catch (err) {
          // Fall back to SPA shell if no manifest
        }
      }

      if (options.routes && options.manifest) {
        try {
          const ssrResponse = await ssrRender(request, options, staticDir as string)
          if (ssrResponse) return ssrResponse
        } catch (e) {
          console.error('[auwla] SSR render failed, falling back to SPA shell:', e)
          // SSR errors fall through to static/SPA fallback — never crash the server.
        }
      }
    }

    // 3. Static files
    if (staticDir && typeof Bun !== 'undefined') {
      const url = new URL(request.url)
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname
      const file = Bun.file(`${staticDir}${pathname}`)

      if (await file.exists()) {
        const headers = new Headers()
        if (pathname.startsWith('/assets/')) {
          headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        } else {
          headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
        }
        return new Response(file as any, { headers })
      }

      // 4. SPA fallback: serve index.html for unmatched page navigations.
      if (acceptsHtml) {
        const indexFile = Bun.file(`${staticDir}/index.html`)
        if (await indexFile.exists()) {
          return new Response(indexFile as any, {
            headers: {
              'Cache-Control': 'public, max-age=0, must-revalidate',
            },
          })
        }
      }
    }

    // 5. 404
    // In dev mode (if Bun is undefined), return undefined to let Vite handle it
    if (typeof Bun === 'undefined') return undefined as any

    return new Response('Not found', { status: 404 })
  }
}
