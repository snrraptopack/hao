/**
 * @fileoverview Tests for layout file detection, directory tree building,
 * and the layout-aware virtual module generator.
 *
 * Tests are grouped by the function they exercise:
 *   - isLayoutFile()              — filename pattern detection
 *   - posixDirname()              — utility function
 *   - buildDirectoryTree()        — tree construction from flat lists
 *   - generateVirtualModuleWithLayouts() — generated code correctness
 */

import { describe, it, expect } from 'vitest'
import { isLayoutFile, posixDirname, buildDirectoryTree } from '../../src/vite-router/scanner'
import { generateVirtualModuleWithLayouts } from '../../src/vite-router/codegen'
import type { PageFile, LayoutFile, DirectoryNode } from '../../src/vite-router/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePage(
  relativePath: string,
  routePath: string,
  opts: Partial<PageFile['exports']> = {},
): PageFile {
  return {
    filePath: `/pages/${relativePath}`,
    relativePath,
    routePath,
    exports: {
      hasDefault: true,
      hasRouted:  opts.hasRouted  ?? false,
      hasPending: opts.hasPending ?? false,
      hasError:   opts.hasError   ?? false,
      hasGuard:   opts.hasGuard   ?? false,
      hasMeta:    opts.hasMeta    ?? false,
    },
  }
}

function makeLayout(relativePath: string, hasGuard = false): LayoutFile {
  const dirPath  = posixDirname(relativePath)
  const basePath = dirPath === '' ? '/' : '/' + dirPath
  return {
    filePath:     `/pages/${relativePath}`,
    relativePath,
    dirPath,
    basePath,
    hasGuard,
  }
}

// ---------------------------------------------------------------------------
// isLayoutFile
// ---------------------------------------------------------------------------

describe('isLayoutFile', () => {
  it('matches _layout.tsx', () => expect(isLayoutFile('_layout.tsx')).toBe(true))
  it('matches _layout.ts',  () => expect(isLayoutFile('_layout.ts')).toBe(true))
  it('matches _layout.jsx', () => expect(isLayoutFile('_layout.jsx')).toBe(true))
  it('matches _layout.js',  () => expect(isLayoutFile('_layout.js')).toBe(true))

  it('does not match layout.tsx (no underscore)', () =>
    expect(isLayoutFile('layout.tsx')).toBe(false))
  it('does not match _layout.vue',  () => expect(isLayoutFile('_layout.vue')).toBe(false))
  it('does not match index.tsx',    () => expect(isLayoutFile('index.tsx')).toBe(false))
  it('does not match __layout.tsx', () => expect(isLayoutFile('__layout.tsx')).toBe(false))
})

// ---------------------------------------------------------------------------
// posixDirname
// ---------------------------------------------------------------------------

describe('posixDirname', () => {
  it('returns empty string for root-level files', () => {
    expect(posixDirname('index.tsx')).toBe('')
    expect(posixDirname('about.tsx')).toBe('')
    expect(posixDirname('_layout.tsx')).toBe('')
  })

  it('returns the directory for nested files', () => {
    expect(posixDirname('dashboard/index.tsx')).toBe('dashboard')
    expect(posixDirname('dashboard/users.tsx')).toBe('dashboard')
    expect(posixDirname('a/b/c.tsx')).toBe('a/b')
  })

  it('handles forward slashes only', () => {
    expect(posixDirname('a/b/c/d.tsx')).toBe('a/b/c')
  })
})

// ---------------------------------------------------------------------------
// buildDirectoryTree
// ---------------------------------------------------------------------------

describe('buildDirectoryTree', () => {
  it('builds a root node with no children for an empty project', () => {
    const tree = buildDirectoryTree([], [])
    expect(tree.dirPath).toBe('')
    expect(tree.basePath).toBe('/')
    expect(tree.layout).toBeNull()
    expect(tree.pages).toHaveLength(0)
    expect(tree.children).toHaveLength(0)
  })

  it('places root-level pages on the root node', () => {
    const pages = [makePage('index.tsx', '/'), makePage('about.tsx', '/about')]
    const tree  = buildDirectoryTree(pages, [])
    expect(tree.pages).toHaveLength(2)
    expect(tree.children).toHaveLength(0)
  })

  it('assigns the root layout when _layout.tsx is at the root', () => {
    const pages   = [makePage('index.tsx', '/')]
    const layouts = [makeLayout('_layout.tsx')]
    const tree    = buildDirectoryTree(pages, layouts)
    expect(tree.layout).not.toBeNull()
    expect(tree.layout!.basePath).toBe('/')
  })

  it('creates a child node for a sub-directory', () => {
    const pages = [
      makePage('index.tsx', '/'),
      makePage('dashboard/index.tsx', '/dashboard'),
    ]
    const tree = buildDirectoryTree(pages, [])
    expect(tree.children).toHaveLength(1)
    const dash = tree.children[0]!
    expect(dash.dirPath).toBe('dashboard')
    expect(dash.basePath).toBe('/dashboard')
    expect(dash.pages).toHaveLength(1)
  })

  it('assigns the sub-directory layout to the child node', () => {
    const pages   = [makePage('dashboard/index.tsx', '/dashboard')]
    const layouts = [makeLayout('dashboard/_layout.tsx')]
    const tree    = buildDirectoryTree(pages, layouts)
    const dash    = tree.children[0]!
    expect(dash.layout).not.toBeNull()
    expect(dash.layout!.dirPath).toBe('dashboard')
  })

  it('handles three levels of nesting', () => {
    const pages = [
      makePage('a/b/c.tsx', '/a/b/c'),
    ]
    const tree = buildDirectoryTree(pages, [])
    const a    = tree.children[0]!
    const b    = a.children[0]!
    expect(a.dirPath).toBe('a')
    expect(b.dirPath).toBe('a/b')
    expect(b.pages).toHaveLength(1)
  })

  it('creates child nodes for directories that have a layout but no pages', () => {
    const pages   = [makePage('index.tsx', '/')]
    const layouts = [makeLayout('admin/_layout.tsx')]
    const tree    = buildDirectoryTree(pages, layouts)
    const admin   = tree.children[0]!
    expect(admin.dirPath).toBe('admin')
    expect(admin.layout).not.toBeNull()
    expect(admin.pages).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// generateVirtualModuleWithLayouts
// ---------------------------------------------------------------------------

describe('generateVirtualModuleWithLayouts', () => {
  function twoPageTree(): DirectoryNode {
    const pages   = [makePage('index.tsx', '/'), makePage('about.tsx', '/about')]
    const layouts = [makeLayout('_layout.tsx')]
    return buildDirectoryTree(pages, layouts)
  }

  it('emits the auwla/router import', () => {
    const tree = buildDirectoryTree([], [])
    expect(generateVirtualModuleWithLayouts(tree)).toContain("import { defineRoutes } from 'auwla/router'")
  })

  it('emits a static import for the layout file', () => {
    const code = generateVirtualModuleWithLayouts(twoPageTree())
    expect(code).toContain('import * as lay0')
    expect(code).toContain('_layout.tsx')
  })

  it('emits static imports for page files', () => {
    const code = generateVirtualModuleWithLayouts(twoPageTree())
    expect(code).toContain('import * as page')
  })

  it('emits the layout chain as route metadata', () => {
    const code = generateVirtualModuleWithLayouts(twoPageTree())
    // Layouts are metadata (applied by the Router around the keyed page).
    expect(code).toContain('layouts: [lay0.default]')
  })

  it('does NOT wrap components when there is no layout', () => {
    const pages = [makePage('index.tsx', '/')]
    const tree  = buildDirectoryTree(pages, [])
    const code  = generateVirtualModuleWithLayouts(tree)
    expect(code).not.toContain('lay')
    expect(code).toContain('page0.default')
  })

  it('generates double-wrapped component for nested layouts', () => {
    const pages = [makePage('dashboard/users.tsx', '/dashboard/users')]
    const layouts = [
      makeLayout('_layout.tsx'),
      makeLayout('dashboard/_layout.tsx'),
    ]
    const tree = buildDirectoryTree(pages, layouts)
    const code = generateVirtualModuleWithLayouts(tree)
    // Outer (lay0) first, inner (lay1) second
    expect(code).toContain('layouts: [lay0.default, lay1.default]')
  })

  it('root pages are wrapped only by the root layout', () => {
    const pages = [
      makePage('index.tsx', '/'),
      makePage('dashboard/users.tsx', '/dashboard/users'),
    ]
    const layouts = [
      makeLayout('_layout.tsx'),
      makeLayout('dashboard/_layout.tsx'),
    ]
    const tree = buildDirectoryTree(pages, layouts)
    const code = generateVirtualModuleWithLayouts(tree)

    // The root page only gets lay0
    expect(code).toContain('layouts: [lay0.default]')
    // The dashboard page gets both
    expect(code).toContain('layouts: [lay0.default, lay1.default]')
  })

  it('applies the layout guard to pages without their own guard', () => {
    const pages   = [makePage('index.tsx', '/')]
    const layouts = [makeLayout('_layout.tsx', /* hasGuard */ true)]
    const tree    = buildDirectoryTree(pages, layouts)
    const code    = generateVirtualModuleWithLayouts(tree)
    expect(code).toContain('guard: lay0.guard')
  })

  it('composes layout guard with page guard when both exist', () => {
    const pages   = [makePage('index.tsx', '/', { hasGuard: true })]
    const layouts = [makeLayout('_layout.tsx', true)]
    const tree    = buildDirectoryTree(pages, layouts)
    const code    = generateVirtualModuleWithLayouts(tree)
    // Both guards must appear in a composed reduce expression.
    expect(code).toContain('lay0.guard')
    expect(code).toMatch(/page\d+\.guard/)
    expect(code).toContain('reduce')
  })

  it('applies layout guards outermost-first to match group() semantics', () => {
    // For a page at dashboard/users.tsx with root layout (lay0) and dashboard
    // layout (lay1), the guard chain must be: lay0.guard → lay1.guard → pageGuard
    // (outer before inner).
    const pages = [makePage('dashboard/users.tsx', '/dashboard/users', { hasGuard: true })]
    const layouts = [
      makeLayout('_layout.tsx', /* hasGuard */ true),           // lay0 — outermost
      makeLayout('dashboard/_layout.tsx', /* hasGuard */ true), // lay1 — innermost
    ]
    const tree = buildDirectoryTree(pages, layouts)
    const code = generateVirtualModuleWithLayouts(tree)

    // Find the guard line and check that lay0 appears BEFORE lay1 in the array.
    const guardLine = code.split('\n').find((l) => l.includes('reduce'))
    expect(guardLine).toBeDefined()
    const lay0Idx = guardLine!.indexOf('lay0.guard')
    const lay1Idx = guardLine!.indexOf('lay1.guard')
    // lay0 (outer / root) must appear before lay1 (inner / dashboard) in the expression.
    expect(lay0Idx).toBeLessThan(lay1Idx)
  })

  it('orders layout-only guards outermost-first when no page guard exists', () => {
    const pages = [makePage('dashboard/users.tsx', '/dashboard/users')]
    const layouts = [
      makeLayout('_layout.tsx', true),           // lay0 — outermost
      makeLayout('dashboard/_layout.tsx', true), // lay1 — innermost
    ]
    const tree = buildDirectoryTree(pages, layouts)
    const code = generateVirtualModuleWithLayouts(tree)

    const guardLine = code.split('\n').find((l) => l.includes('guard'))
    expect(guardLine).toBeDefined()
    const lay0Idx = guardLine!.indexOf('lay0.guard')
    const lay1Idx = guardLine!.indexOf('lay1.guard')
    expect(lay0Idx).toBeLessThan(lay1Idx)
  })

  it('emits routed, pendingComponent, errorComponent and meta for static pages', () => {
    const page  = makePage('index.tsx', '/', {
      hasRouted: true, hasPending: true, hasError: true, hasMeta: true,
    })
    const tree  = buildDirectoryTree([page], [])
    const code  = generateVirtualModuleWithLayouts(tree)
    expect(code).toContain('routed:')
    expect(code).toContain('pendingComponent:')
    expect(code).toContain('errorComponent:')
    expect(code).toContain('meta:')
  })

  describe('lazy mode', () => {
    it('generates dynamic import for pages with routed', () => {
      const page    = makePage('posts/[id].tsx', '/posts/:id', { hasRouted: true })
      const layouts = [makeLayout('_layout.tsx')]
      const tree    = buildDirectoryTree([page], layouts)
      const code    = generateVirtualModuleWithLayouts(tree, /* lazy */ true)
      expect(code).toContain('import(')
      expect(code).toContain('__load')
    })

    it('wraps lazy component cache with layout chain', () => {
      const page    = makePage('posts/[id].tsx', '/posts/:id', { hasRouted: true })
      const layouts = [makeLayout('_layout.tsx')]
      const tree    = buildDirectoryTree([page], layouts)
      const code    = generateVirtualModuleWithLayouts(tree, true)
      // Lazy pages also carry the layout chain as metadata
      expect(code).toContain('layouts: [lay0.default]')
      expect(code).toContain('__mods.get(')
    })

    it('exports __prefetch map for lazy pages', () => {
      const page  = makePage('posts/[id].tsx', '/posts/:id', { hasRouted: true })
      const tree  = buildDirectoryTree([page], [])
      const code  = generateVirtualModuleWithLayouts(tree, true)
      expect(code).toContain('export const __prefetch')
    })
  })
})
