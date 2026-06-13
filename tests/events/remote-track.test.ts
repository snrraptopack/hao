import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stringify } from 'devalue'
import { track } from '../../src/events'
import type { CommandHandle } from '../../src/events'

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
  }
}

describe('remote track functions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('track.get sends RPC request and returns reactive handle', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(stringify([{ id: 1, title: 'Hello' }]), { status: 200 }),
    )

    const posts = track.get('posts.getPosts')
    expect(posts.pending).toBe(true)

    await new Promise((r) => setTimeout(r, 10))

    expect(mockFetch).toHaveBeenCalledWith(
      '/_auwla/rpc',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('posts.getPosts'),
      }),
    )
    expect(posts.resolved).toBe(true)
    expect(posts.value).toEqual([{ id: 1, title: 'Hello' }])
  })

  it('track.post creates a lazy command handle', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(stringify({ id: 2, title: 'Created' }), { status: 200 }),
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
      new Response(stringify({ id: 3, title: 'From form' }), { status: 200 }),
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

  it('track.get propagates RPC errors onto the handle', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(stringify({ message: 'not found' }), { status: 404 }),
    )

    const posts = track.get('posts.getPosts')
    await new Promise((r) => setTimeout(r, 10))

    expect(posts.rejected).toBe(true)
    expect(posts.reason).toBeInstanceOf(Error)
  })
})
