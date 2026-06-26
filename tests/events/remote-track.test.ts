import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMemoApp, h } from '../../src'
import { track, __resetTrackRegistry } from '../../src/track'
import type { CommandHandle } from '../../src/track'

// Augment the server manifest types for these tests.
declare module 'auwla/server-manifest' {
  interface ServerManifestTypes {
    'posts.getPosts': {
      method: 'GET'
      params: Record<string, never>
      args: []
      return: { id: number; title: string }[]
    }
    'posts.createPost': {
      method: 'POST'
      params: Record<string, never>
      args: [{ title: string }]
      return: { id: number; title: string }
    }
    'auth.me': {
      method: 'GET'
      params: Record<string, never>
      args: []
      return: { id: string; name: string }
    }
  }
}

describe('remote track functions', () => {
  beforeEach(() => {
    __resetTrackRegistry()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('track.get sends RPC request and returns reactive handle', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1, title: 'Hello' }]), { status: 200 }),
    )

    const posts = track.get('posts.getPosts')
    expect(posts.pending).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/_auwla/rpc?key=posts.getPosts'),
      expect.objectContaining({
        method: 'GET',
      }),
    )
    expect(posts.resolved).toBe(true)
    expect(posts.value).toEqual([{ id: 1, title: 'Hello' }])
  })

  it('track.post creates a lazy command handle', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 2, title: 'Created' }), { status: 200 }),
    )

    const create = track.post('posts.createPost')
    expect(create.pending).toBe(false)
    expect(create.result).toBeNull()

    const result = await create.run({ title: 'New post' })

    expect(result).toEqual({ id: 2, title: 'Created' })
    expect(create.resolved).toBe(true)
    expect(create.result).not.toBeNull()
    expect(create.value).toEqual({ id: 2, title: 'Created' })
  })

  it('track.post.run accepts FormData', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 3, title: 'From form' }), { status: 200 }),
    )

    const create = track.post('posts.createPost')
    const form = new FormData()
    form.append('title', 'From form')

    await create.run(form)

    const callArgs = mockFetch.mock.calls[0]!
    const body = callArgs[1]!.body as FormData
    expect(body.get('title')).toBe('From form')
    expect(body.get('__auwla_key')).toBe('posts.createPost')
  })

  it('track.get skips background sync when route path changes', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: '1', title: 'Hello' }), { status: 200 }),
    )

    const first = track.get('posts.getPost' as any, { routePath: '/posts/1' })
    await new Promise((r) => setTimeout(r, 10))
    expect(first.resolved).toBe(true)

    mockFetch.mockClear()

    // Simulate the same query being reached again after navigating away.
    const second = track.get('posts.getPost' as any, { routePath: '/posts' })
    await new Promise((r) => setTimeout(r, 10))

    expect(second.resolved).toBe(true)
    expect(second.value).toEqual({ id: '1', title: 'Hello' })
    expect(mockFetch).toHaveBeenCalledTimes(0)
  })

  it('track.get propagates RPC errors onto the handle', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'not found' }), { status: 404 }),
    )

    const posts = track.get('posts.getPosts')
    await new Promise((r) => setTimeout(r, 10))

    expect(posts.rejected).toBe(true)
    expect(posts.reason).toBeInstanceOf(Error)
  })

  it('track.get created in setup auto-subscribes component', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockImplementation(
      async () => new Response(JSON.stringify({ id: '1', name: 'Ada' }), { status: 200 })
    )

    const root = document.createElement('div')
    let renderCount = 0

    function App() {
      track.get('auth.me')
      return () => {
        renderCount++
        return h('div', {}, 'app')
      }
    }

    createMemoApp(root, () => h(App as any))
    expect(renderCount).toBe(1)

    await new Promise((r) => setTimeout(r, 10))

    expect(renderCount).toBe(2)
  })

  it('track.post created in setup auto-subscribes component', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockImplementation(
      async () => new Response(JSON.stringify({ id: 2, title: 'Created' }), { status: 200 })
    )

    const root = document.createElement('div')
    let renderCount = 0

    function App() {
      const save = track.post('posts.createPost')
      save.run({ title: 'Hello' })
      return () => {
        renderCount++
        return h('div', {}, 'app')
      }
    }

    createMemoApp(root, () => h(App as any))
    expect(renderCount).toBe(1)

    await new Promise((r) => setTimeout(r, 10))

    // Subscribed both to the command resultCell and the internal track statusCell,
    // so the component may render more than once; the important thing is it re-renders.
    expect(renderCount).toBeGreaterThanOrEqual(2)
  })
})
