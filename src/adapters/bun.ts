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
import { ssrRender } from './shared'
import { getRegisteredServerManifest, importServerManifestVirtualModule } from '../server/utils'
import type { Route } from '../router/types'
import type { SsrInvokeOptions } from '../server/ssr-invoke'
import { resolve as resolvePath, sep } from 'node:path'

/**
 * Log a warning once per process. Used for lazy-load failures that
 * intentionally fall back to the SPA shell, so they stay visible without
 * spamming every request.
 */
const warned = new Set<string>()
function warnOnce(message: string, err?: unknown): void {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message, err ?? '')
}

/**
 * Resolve a URL path against the static root, returning null when the result
 * would escape the root (path traversal — S5). Encoded dot segments are
 * decoded first so `%2e%2e` cannot smuggle `..` past the check, and NUL bytes
 * are rejected outright.
 */
export function resolveStaticPath(staticDir: string, urlPath: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const root = resolvePath(staticDir)
  // Strip leading slashes so an absolute-looking URL path stays a join.
  const candidate = resolvePath(root, decoded.replace(/^[/\\]+/, ''))
  return candidate === root || candidate.startsWith(root + sep) ? candidate : null
}

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

    // 2. Static files (excluding root and index.html to allow SSR routing)
    if (staticDir && typeof Bun !== 'undefined') {
      const url = new URL(request.url)
      const pathname = url.pathname
      if (pathname !== '/' && pathname !== '/index.html') {
        // Containment check (S5): reject paths that escape staticDir, e.g.
        // `/../secret` or `/%2e%2e/%2e%2e/etc/passwd`.
        const filePath = resolveStaticPath(staticDir, pathname)
        if (filePath) {
          const file = Bun.file(filePath)
          if (await file.exists()) {
            const headers = new Headers()
            if (pathname.startsWith('/assets/')) {
              headers.set('Cache-Control', 'public, max-age=31536000, immutable')
            } else {
              headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
            }
            return new Response(file as any, { headers })
          }
        }
      }
    }

    // 3. SSR page rendering (only for HTML requests)
    const acceptsHtml = (request.headers.get('accept') ?? '').includes('text/html')
    if (acceptsHtml && staticDir) {
      if (!options.routes) {
        try {
          // Literal specifier: resolved by the router plugin's resolveId in
          // Vite dev/SSR and rewritten to a bundled chunk in production
          // builds. A variable specifier would bypass both and silently fail.
          options.routes = (await import('auwla:routes')).default
        } catch (err) {
          // It's ok if routes aren't available, we just fall back to SPA shell
          warnOnce('[auwla] Failed to load auwla:routes for SSR (falling back to SPA shell):', err)
        }
      }
      if (!options.manifest) {
        // Prefer the self-registered manifest (set by the generated
        // auwla:server-manifest module); fall back to a guarded lazy import.
        options.manifest = getRegisteredServerManifest() ?? await importServerManifestVirtualModule()
        if (!options.manifest) {
          warnOnce('[auwla] Failed to load auwla:server-manifest for SSR (falling back to SPA shell)')
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

      // 4. SPA fallback: serve index.html for unmatched page navigations.
      if (acceptsHtml && typeof Bun !== 'undefined') {
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
    // In dev mode (when Bun is undefined), fall through for HTML page
    // requests so Vite's middleware can handle them; everything else is a
    // genuine 404.
    if (typeof Bun === 'undefined' && (request.headers.get('accept') ?? '').includes('text/html')) {
      return undefined as any
    }

    return new Response('Not found', { status: 404 })
  }
}
