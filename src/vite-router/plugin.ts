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

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { AuwlaRouterOptions } from './types'
import { scanPagesAndLayouts, buildDirectoryTree } from './scanner'
import { generateVirtualModule, generateLazyVirtualModule, generateVirtualModuleWithLayouts, generateTypeFile } from './codegen'

/** The public import specifier users write in their app code. */
const VIRTUAL_MODULE_ID = 'auwla:routes'

/**
 * The resolved ID Vite uses internally for the virtual module.
 * The leading `\0` is the Vite convention that prevents other plugins from
 * trying to process this module as a real file.
 */
const RESOLVED_VIRTUAL_ID = '\0auwla:routes'

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
  const pagesRelDir = options.dir     ?? 'src/pages'
  const genRelFile  = options.genFile ?? 'src/auwla.gen.ts'
  const isLazy      = options.lazy    ?? false

  /** Resolved after Vite's `configResolved` hook fires. */
  let resolvedPagesDir = ''
  let resolvedGenFile  = ''

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
      resolvedPagesDir = resolve(config.root, pagesRelDir)
      resolvedGenFile  = resolve(config.root, genRelFile)
    },

    // -----------------------------------------------------------------------
    // Build start — runs for both `vite build` and `vite dev` startup
    // -----------------------------------------------------------------------

    buildStart() {
      const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy)
      cachedVirtualModule = moduleCode
      writeSafe(resolvedGenFile, typeCode)
    },

    // -----------------------------------------------------------------------
    // Virtual module resolution
    // -----------------------------------------------------------------------

    resolveId(source: string): string | null {
      if (source === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID
      return null
    },

    load(id: string): string | null {
      // Returning null tells Vite this plugin does not handle the module.
      if (id !== RESOLVED_VIRTUAL_ID) return null

      // Cache miss: regenerate (possible if buildStart was skipped in tests).
      if (!cachedVirtualModule) {
        const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy)
        cachedVirtualModule = moduleCode
        writeSafe(resolvedGenFile, typeCode)
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

      /** Rebuild routes and hot-reload the app when a page file changes. */
      const handleChange = (file: string) => {
        if (!isPageFile(file, resolvedPagesDir, extensions)) return

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

        // A full page reload is the safest strategy: route additions or
        // removals change the route table shape, not just component internals.
        server.hot?.send({ type: 'full-reload' })

        // Store fresh code after triggering reload so it is available on the
        // next `load()` call from the reloaded client.
        cachedVirtualModule = moduleCode
      }

      server.watcher.on('add',    handleChange)
      server.watcher.on('unlink', handleChange)
      server.watcher.on('change', handleChange)
    },
  }
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
