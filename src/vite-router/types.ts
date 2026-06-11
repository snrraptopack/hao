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
