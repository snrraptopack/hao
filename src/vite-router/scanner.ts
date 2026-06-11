/**
 * @fileoverview File system scanner for the auwla/vite-router plugin.
 *
 * Walks a pages directory, converts file paths to route paths using the
 * bracket-param convention, and performs a lightweight regex scan of each
 * file's source to detect which named exports are present.
 *
 * This module has no Vite dependency — it is pure Node.js and can be unit-
 * tested without a running Vite dev server.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import type { PageFile, PageExports, AuwlaRouterOptions } from './types'

/** Extensions considered page files when no override is provided. */
const DEFAULT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scans `pagesDir` recursively and returns a sorted array of page descriptors.
 *
 * Only files that have a default export (the page component) are included.
 * Files without `export default` are silently skipped — they may be shared
 * utilities or sub-components that live alongside pages.
 *
 * The returned array is sorted so that:
 *   1. Static routes come before dynamic ones.
 *   2. Deeper paths come before shallower paths with the same dynamic count.
 *   3. The catch-all route (*) is always last.
 *
 * This order means the generated `defineRoutes([...])` array is safe to hand
 * directly to the router, which matches routes in declaration order.
 */
export function scanPages(
  pagesDir: string,
  options: Pick<AuwlaRouterOptions, 'extensions'> = {},
): PageFile[] {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS
  const collected: PageFile[] = []

  collectFiles(pagesDir, pagesDir, extensions, collected)

  return sortRoutes(collected)
}

/**
 * Converts a file path (relative to the pages directory) into a router path.
 *
 * Conversion rules (applied in order):
 *   - Extension stripped.
 *   - `index` segment at any level collapses to the parent path.
 *   - `[param]`           → `:param`  (dynamic segment)
 *   - `[...name]`         → `*`       (catch-all, replaces entire path)
 *   - Everything else     → literal segment
 *
 * Examples:
 *   'index.tsx'                  → '/'
 *   'about.tsx'                  → '/about'
 *   'posts/index.tsx'            → '/posts'
 *   'posts/[id].tsx'             → '/posts/:id'
 *   'posts/[id]/comments.tsx'    → '/posts/:id/comments'
 *   '[...404].tsx'               → '*'
 */
export function filePathToRoutePath(relativePath: string): string {
  // Normalise to forward-slashes (Windows safety) and strip extension.
  const normalised = relativePath.replace(/\\/g, '/')
  const withoutExt = normalised.replace(/\.[^./]+$/, '')
  const segments = withoutExt.split('/')

  const routeSegments: string[] = []

  for (const segment of segments) {
    // Spread / catch-all: [...name] → return '*' immediately (replaces whole path)
    if (/^\[\.\.\./.test(segment)) {
      return '*'
    }

    // Dynamic param: [paramName] → :paramName
    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    if (dynamicMatch) {
      routeSegments.push(`:${dynamicMatch[1]}`)
      continue
    }

    // Index file: collapse into parent — do not push a segment.
    if (segment === 'index') {
      continue
    }

    routeSegments.push(segment)
  }

  // An empty segments array means the root index file → '/'
  return '/' + routeSegments.join('/')
}

/**
 * Detects which named exports are present in the given source text.
 *
 * Uses lightweight regular expressions rather than a full TypeScript AST so
 * that scanning is fast and works on any dialect (TSX, JSX, plain TS/JS).
 * False positives can occur for exports inside comments or string literals,
 * but these are extremely rare in practice and have no harmful side effects
 * (at worst an optional route property is set to `undefined`).
 */
export function detectExports(source: string): PageExports {
  const hasExport = (name: string): boolean =>
    // Matches: export const X, export function X, export async function X
    new RegExp(
      `\\bexport\\s+(?:async\\s+)?(?:const|function|class)\\s+${name}\\b`,
    ).test(source)

  return {
    hasDefault: /\bexport\s+default\b/.test(source),
    hasRouted:  hasExport('routed'),
    hasPending: hasExport('pending'),
    hasError:   hasExport('error'),
    hasGuard:   hasExport('guard'),
    hasMeta:    hasExport('meta'),
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walks `currentDir`, collecting page files into `result`.
 * Silently returns when the directory does not exist (e.g. before the user
 * has created their pages folder).
 */
function collectFiles(
  rootDir: string,
  currentDir: string,
  extensions: string[],
  result: PageFile[],
): void {
  let entries: string[]
  try {
    entries = readdirSync(currentDir)
  } catch {
    // Directory does not exist yet — no routes to discover.
    return
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      collectFiles(rootDir, fullPath, extensions, result)
      continue
    }

    if (!extensions.includes(extname(entry))) continue

    // Normalise to forward-slashes for cross-platform consistency.
    const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/')

    let source: string
    try {
      source = readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }

    const exports = detectExports(source)

    // A page must export a default component — skip utility/shared files.
    if (!exports.hasDefault) continue

    result.push({
      filePath: fullPath,
      relativePath,
      routePath: filePathToRoutePath(relativePath),
      exports,
    })
  }
}

/**
 * Sorts page files into stable route declaration order.
 *
 * Priority (ascending → highest priority first):
 *   1. Catch-all (*) always last.
 *   2. Fewer dynamic segments = higher priority (static beats dynamic).
 *   3. Lexicographic on the route path as a stable tiebreaker.
 */
function sortRoutes(files: PageFile[]): PageFile[] {
  return [...files].sort((a, b) => {
    const aIsCatchAll = a.routePath === '*'
    const bIsCatchAll = b.routePath === '*'
    if (aIsCatchAll !== bIsCatchAll) return aIsCatchAll ? 1 : -1

    const aDynamic = (a.routePath.match(/:/g) ?? []).length
    const bDynamic = (b.routePath.match(/:/g) ?? []).length
    if (aDynamic !== bDynamic) return aDynamic - bDynamic

    return a.routePath.localeCompare(b.routePath)
  })
}
