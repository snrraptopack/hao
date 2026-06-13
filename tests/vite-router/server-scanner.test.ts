import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import {
  scanServerModules,
  filePathToRouteName,
  filePathToServerRouteName,
  filePathToRoutePattern,
  filePathToParamsType,
  filePathToParams,
  extractServerExports,
} from '../../src/vite-router/server-scanner'

const fixturesDir = resolve(__dirname, '../router/server-fixtures')

describe('server-scanner', () => {
  it('finds .server.ts files in pages and server dirs', () => {
    const modules = scanServerModules(
      resolve(fixturesDir, 'pages'),
      resolve(fixturesDir, 'server'),
    )

    const routeNames = modules.map((m) => m.routeName).sort()
    expect(routeNames).toEqual(['about', 'auth', 'posts', 'posts'])
  })

  it('computes route names from pages paths', () => {
    expect(filePathToRouteName('posts/index.server.ts')).toBe('posts')
    expect(filePathToRouteName('posts/[id].server.ts')).toBe('posts')
    expect(filePathToRouteName('posts/[id]/comments.server.ts')).toBe('posts.comments')
    expect(filePathToRouteName('about.server.ts')).toBe('about')
    expect(filePathToRouteName('index.server.ts')).toBe('index')
  })

  it('computes route names from server-dir paths', () => {
    expect(filePathToServerRouteName('auth.server.ts')).toBe('auth')
    expect(filePathToServerRouteName('billing/invoice.server.ts')).toBe('billing.invoice')
  })

  it('computes route patterns from pages paths', () => {
    expect(filePathToRoutePattern('index.server.ts')).toBe('/')
    expect(filePathToRoutePattern('about.server.ts')).toBe('/about')
    expect(filePathToRoutePattern('posts/index.server.ts')).toBe('/posts')
    expect(filePathToRoutePattern('posts/[id].server.ts')).toBe('/posts/:id')
    expect(filePathToRoutePattern('posts/[id]/comments.server.ts')).toBe('/posts/:id/comments')
    expect(filePathToRoutePattern('posts/[...slug].server.ts')).toBe('/posts/*')
  })

  it('computes params types from pages paths', () => {
    expect(filePathToParamsType('posts/index.server.ts')).toBe('Record<string, never>')
    expect(filePathToParamsType('posts/[id].server.ts')).toBe('{ id: string }')
    expect(filePathToParamsType('posts/[...slug].server.ts')).toBe('{ slug: string[] }')
    expect(filePathToParamsType('posts/[category]/[id].server.ts')).toBe('{ category: string; id: string }')
  })

  it('computes ordered param names from pages paths', () => {
    expect(filePathToParams('posts/index.server.ts')).toEqual([])
    expect(filePathToParams('posts/[id].server.ts')).toEqual(['id'])
    expect(filePathToParams('posts/[...slug].server.ts')).toEqual(['slug'])
    expect(filePathToParams('posts/[category]/[id].server.ts')).toEqual(['category', 'id'])
  })

  it('extracts exports from plain async functions defaulting to GET', () => {
    const source = `export async function getPosts(): Promise<Post[]> { return [] }`
    const exports = extractServerExports(source)
    expect(exports).toHaveLength(1)
    expect(exports[0]).toMatchObject({
      name: 'getPosts',
      method: 'GET',
      argsType: [],
      returnType: 'Post[]',
    })
  })

  it('extracts remote.post exports', () => {
    const source = `export const createPost = remote.post([validate(schema)], async (data: { title: string }): Promise<Post> => { return {} as Post })`
    const exports = extractServerExports(source)
    expect(exports).toHaveLength(1)
    expect(exports[0]).toMatchObject({
      name: 'createPost',
      method: 'POST',
      argsType: ['{ title: string }'],
      returnType: 'Post',
    })
  })

  it('extracts typed function arguments', () => {
    const source = `export async function find(limit: number, offset?: number): Promise<Post[]> { return [] }`
    const exports = extractServerExports(source)
    expect(exports[0]!.argsType).toEqual(['number', 'number | undefined'])
  })
})
