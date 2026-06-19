import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { invokeRemoteServer } from '../../src/server/ssr-invoke'
import { setRpcDispatcher, clearRpcDispatcher } from '../../src/runtime/rpc-dispatcher'
import type { ServerManifest } from '../../src/server/types'

describe('ssr-invoke', () => {
  afterEach(() => {
    clearRpcDispatcher()
  })

  it('invokes a plain GET remote function directly', async () => {
    const manifest: ServerManifest = {
      'posts.getPosts': {
        modulePath: '/fake/posts.server.ts',
        exportName: 'getPosts',
        method: 'GET',
        routePattern: '/posts',
        params: [],
        paramsType: '{}',
        argsType: [],
        returnType: 'Post[]',
      },
    }

    const load = async () => ({
      async getPosts() {
        return [{ id: '1', title: 'Hello SSR' }]
      },
    })

    const result = await invokeRemoteServer(
      manifest,
      'posts.getPosts',
      [],
      '/posts',
      new Request('http://localhost/posts'),
      { load },
    )

    expect(result).toEqual([{ id: '1', title: 'Hello SSR' }])
  })

  it('invokes a remote.post function with middleware', async () => {
    const manifest: ServerManifest = {
      'posts.createPost': {
        modulePath: '/fake/posts.server.ts',
        exportName: 'createPost',
        method: 'POST',
        routePattern: '/posts',
        params: [],
        paramsType: '{}',
        argsType: ['{ title: string }'],
        returnType: 'Post',
      },
    }

    const { remote, defineMiddleware } = await import('../../src/server')

    const addHeader = defineMiddleware(async (ctx, next) => {
      ctx.locals.createdBy = 'ssr'
      return next()
    })

    const createPost = remote.post([addHeader], async (ctx: any, data: { title: string }) => {
      return { id: '2', title: data.title, createdBy: ctx.locals.createdBy }
    })

    const load = async () => ({ createPost })

    const result = await invokeRemoteServer(
      manifest,
      'posts.createPost',
      [{ title: 'From SSR' }],
      '/posts',
      new Request('http://localhost/posts', { method: 'POST' }),
      { load, method: 'POST' },
    )

    expect(result).toEqual({ id: '2', title: 'From SSR', createdBy: 'ssr' })
  })

  it('extracts route params for route-scoped functions', async () => {
    const manifest: ServerManifest = {
      'posts.getPost': {
        modulePath: '/fake/posts.server.ts',
        exportName: 'getPost',
        method: 'GET',
        routePattern: '/posts/:id',
        params: ['id'],
        paramsType: '{ id: string }',
        argsType: [],
        returnType: 'Post',
      },
    }

    const { getParams } = await import('../../src/server')

    const load = async () => ({
      async getPost() {
        return { id: getParams('/posts/:id').id }
      },
    })

    const result = await invokeRemoteServer(
      manifest,
      'posts.getPost',
      [],
      '/posts/42',
      new Request('http://localhost/posts/42'),
      { load },
    )

    expect(result).toEqual({ id: '42' })
  })

  it('invokes remote.post even when the incoming request is GET', async () => {
    const manifest: ServerManifest = {
      'posts.createPost': {
        modulePath: '/fake/posts.server.ts',
        exportName: 'createPost',
        method: 'POST',
        routePattern: '/posts',
        params: [],
        paramsType: '{}',
        argsType: ['{ title: string }'],
        returnType: 'Post',
      },
    }

    const load = async () => ({
      async createPost(data: { title: string }) {
        return { id: '3', title: data.title }
      },
    })

    // SSR page requests are GET, but the remote function is POST with args.
    const result = await invokeRemoteServer(
      manifest,
      'posts.createPost',
      [{ title: 'From GET request' }],
      '/posts',
      new Request('http://localhost/posts'),
      { load, method: 'POST' },
    )

    expect(result).toEqual({ id: '3', title: 'From GET request' })
  })

  it('wires track.get to the dispatcher on the server', async () => {
    const manifest: ServerManifest = {
      'posts.getPosts': {
        modulePath: '/fake/posts.server.ts',
        exportName: 'getPosts',
        method: 'GET',
        routePattern: '/posts',
        params: [],
        paramsType: '{}',
        argsType: [],
        returnType: 'Post[]',
      },
    }

    const load = async () => ({
      async getPosts() {
        return [{ id: '1', title: 'Dispatched' }]
      },
    })

    setRpcDispatcher((key, args, routePath, options) =>
      invokeRemoteServer(manifest, key, args, routePath, new Request(`http://localhost${routePath}`), { load, ...options }),
    )

    const { track } = await import('../../src/events')
    const handle = track.get('posts.getPosts' as any)

    // Wait for the promise to resolve.
    await new Promise((r) => setTimeout(r, 10))

    expect(handle.resolved).toBe(true)
    expect(handle.value).toEqual([{ id: '1', title: 'Dispatched' }])
  })
})
