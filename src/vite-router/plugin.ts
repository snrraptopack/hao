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
import { resolve, dirname, basename, relative } from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import * as ts from 'typescript'
import type { AuwlaRouterOptions } from './types'
import { scanPagesAndLayouts, buildDirectoryTree } from './scanner'
import { generateVirtualModule, generateLazyVirtualModule, generateVirtualModuleWithLayouts, generateTypeFile } from './codegen'
import { scanServerModules, SERVER_EXTENSIONS, filePathToRouteName, filePathToServerRouteName } from './server-scanner'
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

/**
 * Module-level flag that prevents the SSG generator from running more than once
 * per Node.js process. It must live here (not inside the plugin closure) because
 * each `auwlaRouter()` call — including those triggered by the inner Vite dev
 * server we boot during SSG — creates a fresh closure instance.  A shared
 * module-level variable is the only way to stop the recursion.
 */
let ssgIsRunning = false

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
  let pagesRelDir     = options.directories?.pages ?? 'src/pages'
  let genRelFile      = options.router?.genFile     ?? 'src/auwla.gen.ts'
  let serverRelDir    = options.directories?.server ?? 'src/server'
  let manifestRelDir  = options.directories?.manifest ?? '.auwla'
  let isLazy          = options.router?.lazy        ?? false

  /** Resolved after Vite's `configResolved` hook fires. */
  let resolvedPagesDir = ''
  let resolvedGenFile  = ''
  let resolvedServerDir = ''
  let resolvedManifestDir = ''
  let viteConfig: ResolvedConfig

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

    async config(viteConfig, env) {
      const { loadConfigFromFile } = await import('vite');
      const fs = await import('node:fs');
      const path = await import('node:path');
      const root = viteConfig.root || process.cwd();
      
      let loaded = null;
      if (fs.existsSync(path.resolve(root, 'auwla.config.ts'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.ts', root);
      } else if (fs.existsSync(path.resolve(root, 'auwla.config.js'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.js', root);
      } else if (fs.existsSync(path.resolve(root, 'auwla.config.mjs'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.mjs', root);
      }

      if (loaded) {
        Object.assign(options, loaded.config);
      }
    },

    configResolved(config: ResolvedConfig) {
      viteConfig = config
      pagesRelDir     = options.directories?.pages ?? 'src/pages'
      genRelFile      = options.router?.genFile     ?? 'src/auwla.gen.ts'
      serverRelDir    = options.directories?.server ?? 'src/server'
      manifestRelDir  = options.directories?.manifest ?? '.auwla'
      isLazy          = options.router?.lazy        ?? false

      resolvedPagesDir     = resolve(config.root, pagesRelDir)
      resolvedGenFile      = resolve(config.root, genRelFile)
      resolvedServerDir    = resolve(config.root, serverRelDir)
      resolvedManifestDir  = resolve(config.root, manifestRelDir)
    },

    // -----------------------------------------------------------------------
    // Build start — runs for both `vite build` and `vite dev` startup
    // -----------------------------------------------------------------------

    buildStart() {
      const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy, options.router?.extensions)
      cachedVirtualModule = moduleCode
      writeSafe(resolvedGenFile, typeCode)

      // Generate the fullstack server manifest.
      generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir)
    },

    // -----------------------------------------------------------------------
    // Build end (SSG generation)
    // -----------------------------------------------------------------------

    async closeBundle() {
      // Skip if this is an SSR build or if SSG is already running in this process.
      // ssgIsRunning is module-level so it is shared across all plugin instances,
      // including the inner dev server we create below.
      if (viteConfig.build.ssr) return
      if (ssgIsRunning) return
      ssgIsRunning = true

      try {
        const { createServer } = await import('vite')
        const server = await createServer({
          configFile: viteConfig.configFile,
          server: {
            middlewareMode: true,
            hmr: { port: 0 },
            watch: null,
          },
          appType: 'custom',
        })

        try {
          const routesModule = await server.ssrLoadModule('auwla:routes')
          const routes = routesModule.default

          const ssgRoutes = routes.filter((r: any) => {
            const mode = r.config?.renderMode ?? options.target ?? 'spa'
            return mode === 'ssg'
          })
          if (ssgRoutes.length === 0) return

          console.log(`\n[auwla] Found ${ssgRoutes.length} SSG route(s). Generating static pages...`)

          const { renderToString } = await server.ssrLoadModule('auwla/runtime/ssr')

          const outDir = resolve(viteConfig.root, viteConfig.build.outDir || 'dist')
          const templatePath = resolve(outDir, 'index.html')

          let template = ''
          try {
            const fs = await import('node:fs')
            template = fs.readFileSync(templatePath, 'utf-8')
          } catch {
            console.error(`[auwla] Error: SSG template index.html not found at ${templatePath}`)
            return
          }

          for (const route of ssgRoutes) {
            let paths: string[] = []
            if (route.path.includes(':') || route.path === '*') {
              if (route.config?.generatePaths) {
                const paramsList = await route.config.generatePaths()
                for (const params of paramsList) {
                  let path = route.path
                  for (const [key, value] of Object.entries(params)) {
                    path = path.replace(`:${key}`, String(value))
                  }
                  paths.push(path)
                }
              } else {
                console.warn(`[auwla] Warning: Dynamic route "${route.path}" is configured for SSG but does not export "generatePaths()". Skipping.`)
              }
            } else {
              paths.push(route.path)
            }

            for (const path of paths) {
              console.log(`[auwla] Rendering static page: ${path}`)
              let ssgManifest: ServerManifest = {}
              try {
                const fs = await import('node:fs')
                const manifestPath = resolve(resolvedManifestDir, 'server-manifest.json')
                ssgManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
              } catch (e) {
                console.warn(`[auwla] Warning: Failed to load server manifest for SSG:`, e)
              }

              const result = await renderToString(`http://localhost${path}`, routes, {
                manifest: ssgManifest,
              })

              const pageHtml = template
                .replace('id="app"', 'id="app" data-auwla-ssr="true"')
                .replace('<!--app-html-->', result.html)

              const cleanPath = path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`
              const writePath = resolve(outDir, cleanPath)
              console.log(`[auwla] Writing static page to: ${writePath}`)

              writeSafe(writePath, pageHtml)
            }
          }
        } finally {
          await server.close()
          // Reset only after server.close() fully completes so the inner server's
          // closeBundle calls are still blocked while we are alive.
          ssgIsRunning = false
        }
      } catch (err) {
        console.error('[auwla] SSG generation failed:', err)
        ssgIsRunning = false
      }
    },

    // -----------------------------------------------------------------------
    // Virtual module resolution
    // -----------------------------------------------------------------------

    resolveId(source: string): string | null {
      if (source === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID
      if (source === MANIFEST_VIRTUAL_MODULE_ID) return RESOLVED_MANIFEST_VIRTUAL_ID
      return null
    },

    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const pathname = url.pathname

        // Only rewrite clean document routes (no extensions)
        if (!pathname.includes('.') && pathname !== '/') {
          const outDir = server.config.build.outDir || 'dist'
          const cleanPath = pathname.replace(/^\//, '')
          const staticFile = resolve(server.config.root, outDir, cleanPath, 'index.html')

          if (existsSync(staticFile)) {
            // Internally rewrite to point to the pre-rendered index.html file
            req.url = pathname + (pathname.endsWith('/') ? '' : '/') + 'index.html' + url.search
          }
        }
        next()
      })
    },

    load(id: string, loadOptions?: { ssr?: boolean }): string | null {
      // Prevent server-only files from ever entering the client bundle.
      const isClient = this.environment ? this.environment.name === 'client' : !loadOptions?.ssr
      if (isClient && isServerFile(id)) {
        const cleanId = id.replace(/[?#].*$/, '')
        const normId = cleanId.replace(/\\/g, '/')
        const normPages = resolvedPagesDir.replace(/\\/g, '/')
        const isPages = normId.startsWith(normPages)

        const rootDir = isPages ? resolvedPagesDir : resolvedServerDir
        const relativePath = relative(rootDir, cleanId).replace(/\\/g, '/')

        const routeName = isPages
          ? filePathToRouteName(relativePath)
          : filePathToServerRouteName(relativePath)

        const manifestPath = resolve(resolvedManifestDir, 'server-manifest.json')
        let manifest: ServerManifest = {}
        try {
          manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        } catch {}

        const exports = parseServerExports(cleanId)

        let code = `import { rpcCall } from 'auwla/client';\n`
        for (const name of exports) {
          const key = `${routeName}.${name}`
          const entry = manifest[key]
          const method = entry?.method ?? 'GET'
          code += `export const ${name} = (...args) => rpcCall('${key}', args, { method: '${method}' });\n`
          code += `${name}.__auwla_key = '${key}';\n`
        }
        return code
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
        const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy, options.router?.extensions)
        cachedVirtualModule = moduleCode
        writeSafe(resolvedGenFile, typeCode)

        generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir)
      }

      return cachedVirtualModule
    },

    transform(code: string, id: string, transformOptions?: { ssr?: boolean }) {
      if (id.includes('node_modules')) return null

      const isSsr = this.environment ? this.environment.name === 'ssr' : !!transformOptions?.ssr
      if (isSsr && isServerFile(id)) {
        const cleanId = id.replace(/[?#].*$/, '')
        const normId = cleanId.replace(/\\/g, '/')
        const normPages = resolvedPagesDir.replace(/\\/g, '/')
        const isPages = normId.startsWith(normPages)

        const rootDir = isPages ? resolvedPagesDir : resolvedServerDir
        const relativePath = relative(rootDir, cleanId).replace(/\\/g, '/')

        const routeName = isPages
          ? filePathToRouteName(relativePath)
          : filePathToServerRouteName(relativePath)

        const exports = parseServerExports(cleanId)
        let inject = ''
        for (const name of exports) {
          const key = `${routeName}.${name}`
          inject += `\nif (typeof ${name} !== 'undefined' && ${name} !== null) { ${name}.__auwla_key = '${key}'; }`
        }
        return { code: code + inject, map: null }
      }
      return null
    },

    // -----------------------------------------------------------------------
    // Dev server — file watching + HMR
    // -----------------------------------------------------------------------

    configureServer(server: ViteDevServer) {
      const extensions = options.router?.extensions ?? ['.tsx', '.ts', '.jsx', '.js']

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
        const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy, extensions)
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
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`)
        if (url.pathname !== '/_auwla/rpc' || (req.method !== 'POST' && req.method !== 'GET')) {
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
            load: (modulePath: string) => server.ssrLoadModule(modulePath),
          })
          const request = await nodeRequestToRequest(req)
          const response = await adapter(request, { vite: { server, req, res } })

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
  extensions?: string[]
): { moduleCode: string; typeCode: string } {
  const { pages, layouts } = scanPagesAndLayouts(pagesDir, { extensions })
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
  const cleanPath = file.replace(/[?#].*$/, '')
  return SERVER_EXTENSIONS.some((ext) => cleanPath.endsWith(ext))
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
  const cleanPath = file.replace(/[?#].*$/, '')
  const normFile     = cleanPath.replace(/\\/g, '/')
  const normPagesDir = pagesDir.replace(/\\/g, '/')
  return (
    normFile.startsWith(normPagesDir) &&
    extensions.some((ext) => normFile.endsWith(ext))
  )
}

/**
 * Scan a server module file for named exports.
 */
function parseServerExports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
  const exports: string[] = []

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          exports.push(element.name.text)
        }
      }
    } else if ((ts.getCombinedModifierFlags(statement as any) & ts.ModifierFlags.Export) !== 0) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        exports.push(statement.name.text)
      } else if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text)
          }
        }
      }
    }
  }

  return exports
}
