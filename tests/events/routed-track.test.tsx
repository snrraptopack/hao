import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { stringify } from 'devalue'
import { createMemoApp, h } from '../../src'
import { Router, getRouted, navigate } from '../../src/router'
import { track, __resetTrackRegistry } from '../../src/events'
import type { Route } from '../../src/router'

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

describe('routed + track.get', () => {
  it('renders resolved data and uses setup branching', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(stringify([{ id: '1', title: 'Routed post' }]), { status: 200 }),
    )

    async function routed() {
      return await track.get('posts.getPosts' as any)
    }

    function PostsPage() {
      const loader = getRouted(routed)
      if (loader?.pending) return <div>Loading…</div>
      if (loader?.rejected) return <div>Error</div>
      const posts = loader?.value ?? []
      return () => (
        <ul>
          {posts.map((p) => (
            <li key={p.id}>{p.title}</li>
          ))}
        </ul>
      )
    }

    const routes: Route[] = [{ path: '/posts', component: PostsPage, routed }]
    const root = document.createElement('div')
    navigate('/posts')
    createMemoApp(root, () => h(Router as any, { routes }))

    expect(root.textContent).toBe('Loading…')

    await sleep(30)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(root.textContent).toBe('Routed post')
  })
})
