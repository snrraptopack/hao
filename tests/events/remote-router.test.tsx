import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMemoApp, h } from '../../src'
import { Router, navigate } from '../../src/router'
import { track, __resetTrackRegistry } from '../../src/events'
import type { Route } from '../../src/router'

// Mock global fetch for RPC calls.
beforeEach(() => {
  __resetTrackRegistry()
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('track.get inside Router route', () => {
  it('renders resolved data after RPC succeeds', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: '1', title: 'Hello Router' }]), { status: 200 }),
    )

    function PostsPage() {
      const posts = track.get('posts.getPosts' as any)
      return () => (
        <div>
          {posts.pending && <span>Loading…</span>}
          {posts.rejected && <span>Error</span>}
          {posts.resolved && <span>{posts.value?.[0]?.title}</span>}
        </div>
      )
    }

    const routes: Route[] = [{ path: '/posts', component: PostsPage }]
    const root = document.createElement('div')
    navigate('/posts')
    createMemoApp(root, () => h(Router as any, { routes }))

    expect(root.textContent).toBe('Loading…')

    await sleep(20)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(root.textContent).toBe('Hello Router')
  })
})
