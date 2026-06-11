/**
 * @fileoverview Internal types for the auwla/vite-router plugin.
 *
 * These types describe the data structures passed between the scanner,
 * the code generator, and the Vite plugin hooks. They are not part of the
 * public API — consumers only see AuwlaRouterOptions.
 */

// ---------------------------------------------------------------------------
// Discovered page file
// ---------------------------------------------------------------------------

/**
 * A single page file discovered during directory scanning.
 *
 * Produced by scanPages() and consumed by generateVirtualModule() and
 * generateTypeFile() in codegen.ts.
 */
export type PageFile = {
  /** Absolute path to the page file on disk. */
  filePath: string
  /**
   * Path relative to the pages directory, using forward slashes regardless
   * of the host OS. e.g. 'posts/[id].tsx'.
   */
  relativePath: string
  /** Router path string derived from the file path. e.g. '/posts/:id'. */
  routePath: string
  /** Named exports detected via lightweight source scanning. */
  exports: PageExports
}

/**
 * Named exports the router plugin recognises on each page file.
 * Each flag is set when the corresponding export is found in the source text.
 */
export type PageExports = {
  /** `export default` — the page component. Required; pages without it are skipped. */
  hasDefault: boolean
  /** `export const routed` — async data fetcher. */
  hasRouted: boolean
  /** `export const pending` or `export function pending` — loading UI. */
  hasPending: boolean
  /** `export const error` or `export function error` — error UI. */
  hasError: boolean
  /** `export const guard` — navigation guard. */
  hasGuard: boolean
  /** `export const meta` — static route metadata. */
  hasMeta: boolean
}

// ---------------------------------------------------------------------------
// Layout files
// ---------------------------------------------------------------------------

/**
 * A `_layout.tsx` file discovered during scanning.
 *
 * Layout files are NOT treated as routes. Instead they are imported and
 * applied as layout wrappers around all pages in their directory (and, if
 * nested, inside any ancestor layouts too).
 *
 * Convention:
 *   src/pages/_layout.tsx               → wraps all pages
 *   src/pages/dashboard/_layout.tsx     → wraps /dashboard/* pages
 *
 * The layout file must export a default `LayoutComponent`:
 *   export default function AppShell(content: RouteComponent) {
 *     return () => <div><Nav />{content()}</div>
 *   }
 *
 * It may also export a `guard` that is applied to all pages in the directory:
 *   export const guard = (ctx) => auth.isLoggedIn() || '/login'
 */
export type LayoutFile = {
  /** Absolute path on disk. */
  filePath: string
  /**
   * Path relative to the pages directory, forward-slash separated.
   * e.g. '_layout.tsx' or 'dashboard/_layout.tsx'.
   */
  relativePath: string
  /**
   * Directory path relative to the pages root ('' for root).
   * e.g. '' or 'dashboard'.
   */
  dirPath: string
  /**
   * The route base path this layout covers.
   * Root layout → '/'. Dashboard layout → '/dashboard'.
   */
  basePath: string
  /**
   * Whether the layout file exports a `guard` function.
   * When true, the guard is applied to every page in the directory.
   */
  hasGuard: boolean
}

/**
 * A node in the directory tree used for layout-aware code generation.
 *
 * The tree mirrors the `src/pages/` directory structure. Each node holds
 * the pages directly in its directory and the layout (if any) that wraps
 * them. Children represent sub-directories.
 */
export type DirectoryNode = {
  /** Path relative to the pages root ('') or sub-directory ('dashboard'). */
  dirPath: string
  /** Absolute route base path ('/' or '/dashboard'). */
  basePath: string
  /** Layout for this directory, or null when none is present. */
  layout: LayoutFile | null
  /** Page files sitting directly in this directory (not in sub-directories). */
  pages: PageFile[]
  /** Immediate sub-directory nodes. */
  children: DirectoryNode[]
}

// ---------------------------------------------------------------------------
// Plugin options (public)
// ---------------------------------------------------------------------------

/**
 * Options accepted by auwlaRouter().
 *
 * All fields are optional — sensible defaults are applied when omitted.
 */
export type AuwlaRouterOptions = {
  /**
   * Directory to scan for page files, relative to the Vite project root.
   *
   * File path → route path mapping:
   *   index.tsx               → /
   *   about.tsx               → /about
   *   posts/index.tsx         → /posts
   *   posts/[id].tsx          → /posts/:id
   *   posts/[id]/comments.tsx → /posts/:id/comments
   *   [...404].tsx            → *  (catch-all, always matched last)
   *
   * @default 'src/pages'
   */
  dir?: string

  /**
   * Output path for the generated TypeScript type augmentation file,
   * relative to the Vite project root.
   *
   * The file augments the `Register` interface in 'auwla/router' so that
   * navigate(), isActive(), isExactActive(), and <Link href> all validate
   * against discovered route paths at compile time.
   *
   * This file should be committed to version control.
   *
   * @default 'src/auwla.gen.ts'
   */
  genFile?: string

  /**
   * File extensions treated as page files.
   * @default ['.tsx', '.ts', '.jsx', '.js']
   */
  extensions?: string[]

  /**
   * Enable code splitting via dynamic imports.
   *
   * When true, pages that export a `routed` function are loaded lazily:
   * the page JS chunk is fetched as part of the route's data load, so
   * the component is guaranteed to be in memory by the time it renders.
   * Pages without `routed` continue to use static imports.
   *
   * When false, all pages use static imports (everything in one bundle).
   *
   * @default false
   */
  lazy?: boolean

  /**
   * Enable `<Link prefetch>` support.
   *
   * When true, the router exposes a `prefetchRoute(path)` function that
   * starts both the page chunk download and the routed data fetch for a
   * given path. `<Link prefetch>` calls this on `mouseenter` so that by
   * the time the user clicks, the page is already loading.
   *
   * Requires `lazy: true` to be meaningful for chunk prefetching.
   *
   * @default true
   */
  prefetch?: boolean
}
