import { describe, it, expect } from 'vitest'
import { filePathToRoutePath, detectExports, scanPages } from '../../src/vite-router/scanner'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

// ---------------------------------------------------------------------------
// filePathToRoutePath
// ---------------------------------------------------------------------------

describe('filePathToRoutePath', () => {
  it('maps root index to /', () => {
    expect(filePathToRoutePath('index.tsx')).toBe('/')
  })

  it('maps nested index to parent path', () => {
    expect(filePathToRoutePath('posts/index.tsx')).toBe('/posts')
  })

  it('maps flat file to its name', () => {
    expect(filePathToRoutePath('about.tsx')).toBe('/about')
  })

  it('maps dynamic segment [id] to :id', () => {
    expect(filePathToRoutePath('posts/[id].tsx')).toBe('/posts/:id')
  })

  it('handles nested dynamic segment', () => {
    expect(filePathToRoutePath('posts/[id]/comments.tsx')).toBe('/posts/:id/comments')
  })

  it('handles multiple dynamic segments', () => {
    expect(filePathToRoutePath('orgs/[orgId]/repos/[repoId].tsx')).toBe(
      '/orgs/:orgId/repos/:repoId',
    )
  })

  it('maps spread catch-all [...name] to *', () => {
    expect(filePathToRoutePath('[...404].tsx')).toBe('*')
    expect(filePathToRoutePath('posts/[...slug].tsx')).toBe('*')
  })

  it('strips the file extension', () => {
    expect(filePathToRoutePath('settings.ts')).toBe('/settings')
    expect(filePathToRoutePath('settings.jsx')).toBe('/settings')
    expect(filePathToRoutePath('settings.js')).toBe('/settings')
  })

  it('normalises Windows-style backslashes', () => {
    expect(filePathToRoutePath('posts\\[id].tsx')).toBe('/posts/:id')
  })

  it('produces a leading slash for all non-catch-all routes', () => {
    const result = filePathToRoutePath('a/b/c.tsx')
    expect(result.startsWith('/')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// detectExports
// ---------------------------------------------------------------------------

describe('detectExports', () => {
  it('detects a default export', () => {
    const src = `export default function Home() { return () => <div /> }`
    expect(detectExports(src).hasDefault).toBe(true)
  })

  it('returns hasDefault:false when no default export', () => {
    const src = `export const foo = 42`
    expect(detectExports(src).hasDefault).toBe(false)
  })

  it('detects `export const routed`', () => {
    const src = `export const routed = async (ctx, signal) => fetch('/api')`
    expect(detectExports(src).hasRouted).toBe(true)
  })

  it('detects `export async function routed`', () => {
    const src = `export async function routed(ctx, signal) { return fetch('/api') }`
    expect(detectExports(src).hasRouted).toBe(true)
  })

  it('detects pending as const', () => {
    const src = `export const pending = () => <Skeleton />`
    expect(detectExports(src).hasPending).toBe(true)
  })

  it('detects error as function', () => {
    const src = `export function error() { return () => <ErrorPage /> }`
    expect(detectExports(src).hasError).toBe(true)
  })

  it('detects guard', () => {
    const src = `export const guard = (ctx) => { if (!auth) return '/login' }`
    expect(detectExports(src).hasGuard).toBe(true)
  })

  it('detects meta', () => {
    const src = `export const meta = { title: 'Home' }`
    expect(detectExports(src).hasMeta).toBe(true)
  })

  it('returns all false for an empty file', () => {
    const ex = detectExports('')
    expect(ex.hasDefault).toBe(false)
    expect(ex.hasRouted).toBe(false)
    expect(ex.hasPending).toBe(false)
    expect(ex.hasError).toBe(false)
    expect(ex.hasGuard).toBe(false)
    expect(ex.hasMeta).toBe(false)
  })

  it('does not match a non-exported named function', () => {
    const src = `function routed() {}`
    expect(detectExports(src).hasRouted).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// scanPages — integration with a real temp directory
// ---------------------------------------------------------------------------

describe('scanPages', () => {
  /** Create a throwaway temp directory for each test group. */
  function makeTempDir(): string {
    const dir = join(tmpdir(), `auwla-router-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(dir, { recursive: true })
    return dir
  }

  function writePage(dir: string, relativePath: string, content: string): void {
    const fullPath = join(dir, relativePath)
    mkdirSync(join(fullPath, '..'), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }

  const defaultComponent = `export default function Page() { return () => <div /> }`
  const withRouted = `${defaultComponent}\nexport const routed = async (ctx, signal) => ({})`

  it('returns an empty array when the directory does not exist', () => {
    expect(scanPages('/nonexistent/path/xyz')).toEqual([])
  })

  it('returns an empty array for a directory with no page files', () => {
    const dir = makeTempDir()
    writeFileSync(join(dir, 'utils.ts'), 'export const x = 1')
    expect(scanPages(dir)).toEqual([])
    rmSync(dir, { recursive: true })
  })

  it('discovers a root index file', () => {
    const dir = makeTempDir()
    writePage(dir, 'index.tsx', defaultComponent)

    const pages = scanPages(dir)
    expect(pages).toHaveLength(1)
    expect(pages[0]!.routePath).toBe('/')
    rmSync(dir, { recursive: true })
  })

  it('skips files without a default export', () => {
    const dir = makeTempDir()
    writePage(dir, 'index.tsx', defaultComponent)
    writePage(dir, 'helpers.ts', 'export function helper() {}')

    const pages = scanPages(dir)
    expect(pages).toHaveLength(1)
    rmSync(dir, { recursive: true })
  })

  it('maps nested pages to correct route paths', () => {
    const dir = makeTempDir()
    writePage(dir, 'index.tsx',              defaultComponent)
    writePage(dir, 'posts/index.tsx',        defaultComponent)
    writePage(dir, 'posts/[id].tsx',         withRouted)

    const pages = scanPages(dir)
    const paths = pages.map(p => p.routePath)
    expect(paths).toContain('/')
    expect(paths).toContain('/posts')
    expect(paths).toContain('/posts/:id')
    rmSync(dir, { recursive: true })
  })

  it('detects routed export on a page', () => {
    const dir = makeTempDir()
    writePage(dir, 'posts/[id].tsx', withRouted)

    const pages = scanPages(dir)
    expect(pages[0]!.exports.hasRouted).toBe(true)
    rmSync(dir, { recursive: true })
  })

  it('places the catch-all route last in the sorted output', () => {
    const dir = makeTempDir()
    writePage(dir, 'index.tsx',      defaultComponent)
    writePage(dir, '[...404].tsx',   defaultComponent)
    writePage(dir, 'about.tsx',      defaultComponent)

    const pages = scanPages(dir)
    expect(pages.at(-1)!.routePath).toBe('*')
    rmSync(dir, { recursive: true })
  })

  it('places static routes before dynamic ones', () => {
    const dir = makeTempDir()
    writePage(dir, 'posts/index.tsx',  defaultComponent)
    writePage(dir, 'posts/[id].tsx',   defaultComponent)

    const pages = scanPages(dir)
    const paths = pages.map(p => p.routePath)
    expect(paths.indexOf('/posts')).toBeLessThan(paths.indexOf('/posts/:id'))
    rmSync(dir, { recursive: true })
  })
})
