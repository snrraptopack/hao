import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { scanServerModules } from '../../src/vite-router/server-scanner'
import { buildServerManifest, generateServerManifestDts } from '../../src/vite-router/manifest'

const fixturesDir = resolve(__dirname, '../router/server-fixtures')

describe('manifest', () => {
  it('builds a manifest from scanned modules', () => {
    const modules = scanServerModules(
      resolve(fixturesDir, 'pages'),
      resolve(fixturesDir, 'server'),
    )
    const manifest = buildServerManifest(modules)

    expect(manifest['posts.getPosts']).toMatchObject({
      exportName: 'getPosts',
      method: 'GET',
      paramsType: 'Record<string, never>',
      argsType: [],
      returnType: '{ id: number; title: string; }[]',
    })

    expect(manifest['posts.createPost']).toMatchObject({
      exportName: 'createPost',
      method: 'POST',
      argsType: ['{ title: string }'],
      returnType: '{ id: number }',
    })

    expect(manifest['posts.getPost']).toMatchObject({
      exportName: 'getPost',
      method: 'GET',
      routePattern: '/posts/:id',
      paramsType: '{ id: string }',
      returnType: '{ id: string; title: string }',
    })

    expect(manifest['about.getAbout']).toMatchObject({
      exportName: 'getAbout',
      method: 'GET',
      paramsType: 'Record<string, never>',
    })

    expect(manifest['auth.getUser']).toMatchObject({
      exportName: 'getUser',
      method: 'GET',
      paramsType: 'Record<string, never>',
    })
  })

  it('generates a TypeScript declaration file', () => {
    const modules = scanServerModules(
      resolve(fixturesDir, 'pages'),
      resolve(fixturesDir, 'server'),
    )
    const manifest = buildServerManifest(modules)
    const dts = generateServerManifestDts(manifest)

    expect(dts).toContain("declare module 'auwla/server-manifest' {")
    expect(dts).toContain("'posts.getPosts': {")
    expect(dts).toContain("method: 'GET'")
    expect(dts).toContain("'posts.createPost': {")
    expect(dts).toContain("method: 'POST'")
    expect(dts).toContain('params: { id: string }')
  })
})
