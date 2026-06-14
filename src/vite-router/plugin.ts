/**
 * @fileoverview Vite plugin for auwla file-based routing.
 *
 * Responsibilities (all build-time, zero runtime cost):
 *
 *   1. Resolves the virtual module ID `auwla:routes` and serves the generated
 *      route table so the app can import it without writing routes manually.
 *
 *   2. Writes `auwla.gen.ts` (or the user-configured path) to augment the
 *      `Register` interface in 'auwla/router' — enabling type-safe navigation.
 *
 *   3. Watches the pages directory during `vite dev`. When a page file is
 *      added, removed, or changed, the virtual module and type file are
 *      regenerated and the HMR client is notified.
 *
 * This plugin deliberately contains no routing logic. It is a thin automation
 * layer on top of the existing auwla/router API: the same route definitions
 * the user would write manually in `defineRoutes([...])` are generated from
 * the file structure instead.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { AuwlaRouterOptions } from './types'
import { scanPagesAndLayouts, buildDirectoryTree } from './scanner'
import { generateVirtualModule, generateLazyVirtualModule, generateVirtualModuleWithLayouts, generateTypeFile } from './codegen'
import { scanServerModules, SERVER_EXTENSIONS } from './server-scanner'
import { buildServerManifest, writeServerManifest } from './manifest'
import type { ServerManifest } from '../server/types'

/** The public import specifier users write in their app code. */
const VIRTUAL_MODULE_ID = 'auwla:routes'

/**
 * The resolved ID Vite uses internally for the virtual module.
 * The leading `\0` is the Vite convention that prevents other plugins from
 * trying to process this module as a real file.
 */
const RESOLVED_VIRTUAL_ID = '\0auwla:routes'

/** Virtual module for the server manifest consumed by client RPC. */
const MANIFEST_VIRTUAL_MODULE_ID = 'auwla:server-manifest'
const RESOLVED_MANIFEST_VIRTUAL_ID = '\0auwla:server-manifest'

/** In-memory cache of the generated server manifest JS source. */
let cachedManifestModule: string | null = null

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

/**
 * Creates the auwla router Vite plugin.
 *
 * Usage in vite.config.ts:
 *
 *   import { auwla }       from 'auwla/vite'
 *   import { auwlaRouter } from 'auwla/vite-router'
 *
 *   export default defineConfig({
 *     plugins: [
 *       auwla(),
 *       auwlaRouter({ dir: 'src/pages' }),
 *     ],
 *   })
 *
 * Usage in the app:
 *
 *   import { Router }  from 'auwla/router'
 *   import routes      from 'auwla:routes'   // ← resolved by this plugin
 *
 *   export default function App() {
 *     return () => <Router routes={routes} suspend />
 *   }
 */
export function auwlaRouter(options: AuwlaRouterOptions = {}): Plugin {
  const pagesRelDir     = options.dir         ?? 'src/pages'
  const genRelFile      = options.genFile     ?? 'src/auwla.gen.ts'
  const serverRelDir    = options.serverDir   ?? 'src/server'
  const manifestRelDir  = options.manifestDir ?? '.auwla'
  const isLazy          = options.lazy        ?? false

  /** Resolved after Vite's `configResolved` hook fires. */
  let resolvedPagesDir = ''
  let resolvedGenFile  = ''
  let resolvedServerDir = ''
  let resolvedManifestDir = ''

  /**
   * In-memory cache of the last generated virtual module source.
   * Cleared whenever the pages directory changes so the next `load()` call
   * triggers a fresh scan.
   */
  let cachedVirtualModule: string | null = null

  return {
    name: 'auwla-router',

    /**
     * `pre` enforcement ensures this plugin's `resolveId` runs before
     * other plugins that might claim unknown specifiers.
     */
    enforce: 'pre',

    // -----------------------------------------------------------------------
    // Config
    // -----------------------------------------------------------------------

    configResolved(config: ResolvedConfig) {
      resolvedPagesDir     = resolve(config.root, pagesRelDir)
      resolvedGenFile      = resolve(config.root, genRelFile)
      resolvedServerDir    = resolve(config.root, serverRelDir)
      resolvedManifestDir  = resolve(config.root, manifestRelDir)
    },

    // -----------------------------------------------------------------------
    // Build start — runs for both `vite build` and `vite dev` startup
    // -----------------------------------------------------------------------

    buildStart() {
      const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy)
      cachedVirtualModule = moduleCode
      writeSafe(resolvedGenFile, typeCode)

      // Generate the fullstack server manifest.
      generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir)
    },

    // -----------------------------------------------------------------------
    // Virtual module resolution
    // -----------------------------------------------------------------------

    resolveId(source: string): string | null {
      if (source === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID
      if (source === MANIFEST_VIRTUAL_MODULE_ID) return RESOLVED_MANIFEST_VIRTUAL_ID
      return null
    },

    load(id: string): string | null {
      // Prevent server-only files from ever entering the client bundle.
      // Returning an empty module keeps imports from throwing at runtime.
      if (this.environment?.name === 'client' && isServerFile(id)) {
        return 'export {};'
      }

      // Server manifest virtual module.
      if (id === RESOLVED_MANIFEST_VIRTUAL_ID) {
        // Cache miss: regenerate if needed (e.g. tests skip buildStart).
        if (!cachedManifestModule) {
          const serverModules = scanServerModules(resolvedPagesDir, resolvedServerDir)
          const manifest = buildServerManifest(serverModules)
          cachedManifestModule = `export default ${JSON.stringify(manifest, null, 2)};`
        }
        return cachedManifestModule
      }

      // Returning null tells Vite this plugin does not handle the module.
      if (id !== RESOLVED_VIRTUAL_ID) return null

      // Cache miss: regenerate (possible if buildStart was skipped in tests).
      if (!cachedVirtualModule) {
        const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy)
        cachedVirtualModule = moduleCode
        writeSafe(resolvedGenFile, typeCode)

        generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir)
      }

      return cachedVirtualModule
    },

    // -----------------------------------------------------------------------
    // Dev server — file watching + HMR
    // -----------------------------------------------------------------------

    configureServer(server: ViteDevServer) {
      const extensions = options.extensions ?? ['.tsx', '.ts', '.jsx', '.js']

      // Ensure Vite watches the pages directory even if it is empty or missing.
      server.watcher.add(resolvedPagesDir)
      if (resolvedServerDir) {
        server.watcher.add(resolvedServerDir)
      }

      const isLayoutPath = (file: string): boolean =>
        /^_layout\.[jt]sx?$/.test(basename(file))

      /** Rebuild routes and hot-reload the app when a page file changes. */
      const handleChange = (file: string, event: 'add' | 'unlink' | 'change') => {
        const isPage = isPageFile(file, resolvedPagesDir, extensions)
        const isLayout = isLayoutPath(file)
        if (!isPage && !isLayout) return

        const oldModuleCode = cachedVirtualModule
        const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy)
        cachedVirtualModule = null // force next load() to serve fresh code

        // Write updated types so the editor picks them up immediately.
        writeSafe(resolvedGenFile, typeCode)

        // Invalidate the virtual module in the client environment's module graph
        // so its importers (the Router) are re-evaluated on the next HMR update.
        const clientEnv = server.environments?.client
        const moduleGraph = clientEnv?.moduleGraph ?? server.moduleGraph
        const mod = moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
        if (mod) {
          moduleGraph.invalidateModule(mod)
        }

        // Only force a full page reload when the route table shape actually
        // changes (add/remove/rename) or a layout file is edited. Pure
        // component edits inside a page file are left to Vite's normal HMR.
        const routeTableChanged = oldModuleCode !== moduleCode
        const needsReload = event !== 'change' || isLayout || routeTableChanged

        if (needsReload) {
          server.hot?.send({ type: 'full-reload' })
        }

        // Store fresh code after handling the update so it is available on the
        // next `load()` call from the client.
        cachedVirtualModule = moduleCode
      }

      /** Regenerate the server manifest when a .server.ts file changes. */
      const handleServerChange = () => {
        generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir)
      }

      server.watcher.on('add',    (file: string) => {
        if (isServerFile(file)) handleServerChange()
        else handleChange(file, 'add')
      })
      server.watcher.on('unlink', (file: string) => {
        if (isServerFile(file)) handleServerChange()
        else handleChange(file, 'unlink')
      })
      server.watcher.on('change', (file: string) => {
        if (isServerFile(file)) handleServerChange()
        else handleChange(file, 'change')
      })

      // -----------------------------------------------------------------------
      // Dev-only RPC handler
      //
      // Mounts the Auwla fetch adapter directly on Vite's server so a single
      // dev process serves both HMR and server functions. In production the
      // adapter is run inside the user's Bun/Node server.
      // -----------------------------------------------------------------------
      server.middlewares.use('/_auwla/rpc', async (req, res, next) => {
        // Connect strips the mount path from req.url, so a POST to /_auwla/rpc
        // appears here as req.url === '/'.
        if (req.method !== 'POST' || req.url !== '/') {
          return next()
        }

        try {
          const { createFetchAdapter } = await import('auwla/adapters/fetch')
          const manifestPath = resolve(resolvedManifestDir, 'server-manifest.json')
          const manifest: ServerManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          const adapter = createFetchAdapter({
            manifest,
            // Use Vite's SSR transform so .server.ts files can be loaded directly
            // in dev without pre-compiling them.
            load: (modulePath) => server.ssrLoadModule(modulePath),
          })
          const request = await nodeRequestToRequest(req)
          const response = await adapter(request)

          if (!response) {
            return next()
          }

          await sendNodeResponse(res, response)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

async function nodeRequestToRequest(req: import('http').IncomingMessage): Promise<Request> {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host = req.headers.host || 'localhost'
  // Connect strips the mount path from req.url. Prefer originalUrl (the full
  // incoming path) so the fetch adapter can match the RPC endpoint correctly.
  const pathname = (req as any).originalUrl ?? req.url ?? '/'
  const url = `${protocol}://${host}${pathname}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v))
    } else {
      headers.set(key, value)
    }
  }

  const method = req.method || 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers })
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const body = Buffer.concat(chunks)

  return new Request(url, { method, headers, body })
}

async function sendNodeResponse(
  res: import('http').ServerResponse,
  response: Response,
): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const body = await response.arrayBuffer()
  res.end(Buffer.from(body))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Scans the pages directory and produces the generated module + type file.
 * Extracted so that buildStart() and the watcher share identical logic.
 *
 * Selection order:
 *   1. If any `_layout.tsx` files exist → layout-aware generator
 *      (generateVirtualModuleWithLayouts, supports nested layouts + guards).
 *   2. Else if lazy → lazy generator (dynamic imports per page with routed).
 *   3. Else → static generator (static imports, simplest output).
 */
function generateServerManifest(
  pagesDir: string,
  serverDir: string,
  manifestDir: string,
): void {
  const serverModules = scanServerModules(pagesDir, serverDir)
  const manifest = buildServerManifest(serverModules)
  writeServerManifest(manifestDir, manifest)
  cachedManifestModule = null // force virtual module reload on next request
}

function buildRoutes(
  pagesDir: string,
  lazy: boolean,
): { moduleCode: string; typeCode: string } {
  const { pages, layouts } = scanPagesAndLayouts(pagesDir)
  const typeCode = generateTypeFile(pages)

  let moduleCode: string
  if (layouts.length > 0) {
    // Layout-aware path: build directory tree and use the layout generator.
    // The layout generator also handles the lazy flag internally.
    const tree = buildDirectoryTree(pages, layouts)
    moduleCode = generateVirtualModuleWithLayouts(tree, lazy)
  } else {
    // No layouts: use the simpler existing generators.
    moduleCode = lazy
      ? generateLazyVirtualModule(pages)
      : generateVirtualModule(pages)
  }

  return { moduleCode, typeCode }
}

/**
 * Writes `content` to `filePath`, creating parent directories as needed.
 * Errors are intentionally not swallowed — a failure to write the type file
 * should surface loudly rather than leaving stale types behind.
 */
function writeSafe(filePath: string, content: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Returns true when `file` is a server-only file.
 */
function isServerFile(file: string): boolean {
  return SERVER_EXTENSIONS.some((ext) => file.endsWith(ext))
}

/**
 * Returns true when `file` is inside the pages directory and has one of the
 * accepted page file extensions.
 */
function isPageFile(
  file: string,
  pagesDir: string,
  extensions: string[],
): boolean {
  // Normalise to forward slashes for cross-platform comparison.
  const normFile     = file.replace(/\\/g, '/')
  const normPagesDir = pagesDir.replace(/\\/g, '/')
  return (
    normFile.startsWith(normPagesDir) &&
    extensions.some((ext) => normFile.endsWith(ext))
  )
}
