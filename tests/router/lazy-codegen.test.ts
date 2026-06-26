/**
 * @fileoverview Tests for generateLazyVirtualModule.
 *
 * Verifies the lazy generator's output separately from the static generator
 * already covered in codegen.test.ts.
 */

import { describe, it, expect } from 'vitest'
import { generateLazyVirtualModule } from '../../src/vite-router/codegen'
import type { PageFile } from '../../src/vite-router/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePage(
  routePath: string,
  hasRouted = false,
  filePath = `/src/pages${routePath === '*' ? '/[...404]' : routePath}.tsx`,
): PageFile {
  return {
    filePath,
    relativePath: filePath.replace('/src/pages/', ''),
    routePath,
    exports: {
      hasDefault: true,
      hasRouted,
      hasPending: false,
      hasError:   false,
      hasGuard:   false,
      hasMeta:    false,
      hasConfig:  false,
    },
  }
}

function makeFullLazyPage(routePath: string): PageFile {
  return {
    ...makePage(routePath, true),
    exports: {
      hasDefault: true,
      hasRouted:  true,
      hasPending: true,
      hasError:   true,
      hasGuard:   true,
      hasMeta:    true,
      hasConfig:  true,
    },
  }
}

// ---------------------------------------------------------------------------
// generateLazyVirtualModule
// ---------------------------------------------------------------------------

describe('generateLazyVirtualModule', () => {
  it('still emits the auwla/router import', () => {
    const code = generateLazyVirtualModule([])
    expect(code).toContain("import { defineRoutes } from 'auwla/router'")
  })

  it('uses static import for pages without routed', () => {
    const code = generateLazyVirtualModule([makePage('/', false)])
    // Static page should be imported with `import * as sp0`
    expect(code).toContain('import * as sp0')
    // Must NOT emit __mods or __load for a static-only bundle
    expect(code).not.toContain('__mods')
    expect(code).not.toContain('__load')
  })

  it('static page component references the static alias directly', () => {
    const code = generateLazyVirtualModule([makePage('/about', false)])
    expect(code).toContain('component: sp0.default')
  })

  it('does NOT generate a dynamic import for pages without routed', () => {
    const code = generateLazyVirtualModule([makePage('/', false)])
    expect(code).not.toContain('import(')
  })

  it('generates __mods and __load when there is at least one lazy page', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    expect(code).toContain('__mods')
    expect(code).toContain('__load')
    expect(code).toContain('__inflight')
  })

  it('generates a dynamic import() for lazy pages', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    expect(code).toContain('import(')
  })

  it('component for lazy page reads from __mods cache', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    expect(code).toContain('__mods.get("/posts/:id")')
    expect(code).toContain('?.default?.(props)')
  })

  it('routed wrapper loads module then calls mod.routed', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    expect(code).toContain('const mod = await __load')
    expect(code).toContain('return mod.routed(ctx, signal)')
  })

  it('static and lazy pages coexist in the same module', () => {
    const pages = [
      makePage('/', false),          // static
      makePage('/posts/:id', true),  // lazy
    ]
    const code = generateLazyVirtualModule(pages)
    expect(code).toContain('import * as sp0')   // static import
    expect(code).toContain('__mods')             // lazy infrastructure
    expect(code).toContain('import(')            // dynamic import
    expect(code).toContain('"/"')                // static route path
    expect(code).toContain('"/posts/:id"')       // lazy route path
  })

  it('emits all optional properties for a fully-exported lazy page', () => {
    const code = generateLazyVirtualModule([makeFullLazyPage('/posts/:id')])
    expect(code).toContain('pendingComponent')
    expect(code).toContain('errorComponent')
    expect(code).toContain('guard')
    expect(code).toContain('get meta()')
    expect(code).toContain('get config()')
  })

  it('does NOT emit pendingComponent when page has no pending export', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    expect(code).not.toContain('pendingComponent')
  })

  it('exports __prefetch map when there are lazy pages', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    expect(code).toContain('export const __prefetch')
    expect(code).toContain('"/posts/:id"')
  })

  it('does NOT export __prefetch when there are no lazy pages', () => {
    const code = generateLazyVirtualModule([makePage('/', false)])
    expect(code).not.toContain('__prefetch')
  })

  it('__prefetch entry calls __load with a dynamic import', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    // The prefetch entry should be a function that calls __load
    expect(code).toContain('["/posts/:id"]: () => __load')
  })

  it('normalises Windows backslashes in dynamic import paths', () => {
    const page: PageFile = {
      ...makePage('/posts/:id', true),
      filePath: 'C:\\src\\pages\\posts\\[id].tsx',
    }
    const code = generateLazyVirtualModule([page])
    expect(code).toContain('C:/src/pages/posts/[id].tsx')
    expect(code).not.toContain('\\')
  })

  it('__load is idempotent: uses __inflight to prevent duplicate fetches', () => {
    const code = generateLazyVirtualModule([makePage('/posts/:id', true)])
    // Must check __inflight before starting a new request
    expect(code).toContain('__inflight.has(key)')
    expect(code).toContain('__inflight.get(key)')
  })

  it('catch-all route (*) is included as a lazy page when it has routed', () => {
    const code = generateLazyVirtualModule([makePage('*', true)])
    expect(code).toContain('"*"')
    expect(code).toContain('import(')
  })
})
