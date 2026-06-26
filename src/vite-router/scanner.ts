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
import type { PageFile, PageExports, LayoutFile, DirectoryNode } from './types'

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
  options: { extensions?: string[] } = {},
): PageFile[] {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS
  const collected: PageFile[] = []

  collectFiles(pagesDir, pagesDir, extensions, collected)

  return sortRoutes(collected)
}

/**
 * Scans `pagesDir` recursively and returns page files AND layout files
 * (`_layout.tsx`) separately.
 *
 * This is the layout-aware sibling of `scanPages()`. It uses the same
 * detection logic for page exports, but additionally recognises files named
 * `_layout.{tsx,ts,jsx,js}` and collects them as `LayoutFile` descriptors
 * rather than route pages.
 *
 * The returned `pages` array is sorted (same rules as `scanPages()`).
 * The returned `layouts` array is ordered parent-first (root before children)
 * which matches the import order in generated code.
 */
export function scanPagesAndLayouts(
  pagesDir: string,
  options: { extensions?: string[] } = {},
): { pages: PageFile[]; layouts: LayoutFile[] } {
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS
  const pages: PageFile[] = []
  const layouts: LayoutFile[] = []

  collectFilesAndLayouts(pagesDir, pagesDir, extensions, pages, layouts)

  return { pages: sortRoutes(pages), layouts }
}

/**
 * Builds a `DirectoryNode` tree from a flat list of pages and layouts.
 *
 * The tree mirrors the pages directory structure. Each node represents a
 * single directory and holds the pages directly inside it, the layout for
 * that directory (if any), and its child directory nodes.
 *
 * The root node always has `dirPath: ''` and `basePath: '/'`.
 *
 * Example — given:
 *   pages: [index.tsx, about.tsx, dashboard/index.tsx, dashboard/users.tsx]
 *   layouts: [_layout.tsx, dashboard/_layout.tsx]
 *
 * The resulting tree is:
 *   { dirPath: '', basePath: '/', layout: rootLayout,
 *     pages: [index, about],
 *     children: [{
 *       dirPath: 'dashboard', basePath: '/dashboard', layout: dashLayout,
 *       pages: [dashboard/index, dashboard/users],
 *       children: []
 *     }]
 *   }
 */
export function buildDirectoryTree(
  pages: PageFile[],
  layouts: LayoutFile[],
): DirectoryNode {
  // Index layouts by dirPath for O(1) lookup.
  const layoutByDir = new Map<string, LayoutFile>()
  for (const layout of layouts) {
    layoutByDir.set(layout.dirPath, layout)
  }

  /**
   * Collects the names of the direct child directories of `parentDir`
   * from both the pages and layouts lists.
   */
  function immediateChildDirs(parentDir: string): string[] {
    const seen = new Set<string>()
    const all = [
      ...pages.map((p) => posixDirname(p.relativePath)),
      ...layouts.map((l) => l.dirPath),
    ]

    for (const dir of all) {
      if (parentDir === '') {
        // Root: immediate children are the first segment of any non-root dir.
        const firstSeg = dir.split('/')[0]
        if (firstSeg) seen.add(firstSeg)
      } else {
        if (dir.startsWith(parentDir + '/') && dir !== parentDir) {
          // The next segment after the parent prefix.
          const rest = dir.slice(parentDir.length + 1)
          const next = rest.split('/')[0]
          if (next) seen.add(next)
        }
      }
    }

    return [...seen].sort()
  }

  function buildNode(dirPath: string): DirectoryNode {
    const basePath = dirPath === '' ? '/' : '/' + dirPath
    const layout   = layoutByDir.get(dirPath) ?? null

    // Pages whose dirname exactly matches this dirPath.
    const dirPages = pages.filter(
      (p) => posixDirname(p.relativePath) === dirPath,
    )

    // Recursively build child nodes.
    const children = immediateChildDirs(dirPath).map((seg) => {
      const childDirPath = dirPath === '' ? seg : `${dirPath}/${seg}`
      return buildNode(childDirPath)
    })

    return { dirPath, basePath, layout, pages: dirPages, children }
  }

  return buildNode('')
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
    hasConfig:  hasExport('config'),
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when `filename` matches the layout file convention
 * `_layout.{tsx,ts,jsx,js}` (case-sensitive, underscore-prefixed).
 */
export function isLayoutFile(filename: string): boolean {
  return /^_layout\.[jt]sx?$/.test(filename)
}

/**
 * Returns the dirname of a forward-slash-separated relative path,
 * normalised to '' for root-level files (i.e. no directory prefix).
 *
 * Examples:
 *   'index.tsx'             → ''
 *   'about.tsx'             → ''
 *   'dashboard/index.tsx'   → 'dashboard'
 *   'dashboard/users.tsx'   → 'dashboard'
 *   'a/b/c.tsx'             → 'a/b'
 */
export function posixDirname(relativePath: string): string {
  const idx = relativePath.lastIndexOf('/')
  return idx === -1 ? '' : relativePath.slice(0, idx)
}

/**
 * Recursively walks `currentDir`, collecting page files into `result`.
 * Silently returns when the directory does not exist (e.g. before the user
 * has created their pages folder).
 *
 * Layout files (`_layout.tsx`) are silently skipped here — they are handled
 * by `collectFilesAndLayouts()` and should not appear as routes.
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

    // Skip layout files — they are not routes.
    if (isLayoutFile(entry)) continue

    const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/')

    let source: string
    try {
      source = readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }

    const exports = detectExports(source)
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
 * Recursively walks `currentDir`, separating page files from layout files.
 *
 * Layout files are identified by the `_layout.*` filename convention and are
 * collected into `layouts` instead of `pages`.
 */
function collectFilesAndLayouts(
  rootDir: string,
  currentDir: string,
  extensions: string[],
  pages: PageFile[],
  layouts: LayoutFile[],
): void {
  let entries: string[]
  try {
    entries = readdirSync(currentDir)
  } catch {
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
      collectFilesAndLayouts(rootDir, fullPath, extensions, pages, layouts)
      continue
    }

    if (!extensions.includes(extname(entry))) continue

    const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/')

    // -----------------------------------------------------------------
    // Layout file
    // -----------------------------------------------------------------
    if (isLayoutFile(entry)) {
      let source = ''
      try {
        source = readFileSync(fullPath, 'utf-8')
      } catch {
        continue
      }

      // Only a default export is required; guard export is optional.
      const hasDefault = /\bexport\s+default\b/.test(source)
      if (!hasDefault) continue

      const hasGuard = /\bexport\s+(?:async\s+)?(?:const|function)\s+guard\b/.test(source)
      const dirPath   = posixDirname(relativePath)
      const basePath  = dirPath === '' ? '/' : '/' + dirPath

      layouts.push({ filePath: fullPath, relativePath, dirPath, basePath, hasGuard })
      continue
    }

    // -----------------------------------------------------------------
    // Page file
    // -----------------------------------------------------------------
    let source: string
    try {
      source = readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }

    const exports = detectExports(source)
    if (!exports.hasDefault) continue

    pages.push({
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
