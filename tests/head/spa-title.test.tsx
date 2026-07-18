/** @jsxImportSource auwla */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoApp, h } from '../../src'

let routerMod: Awaited<ReturnType<typeof importRouter>>
async function importRouter() { return import('../../src/router/index') }

describe('client Head updates document.title on SPA navigation', () => {
  beforeEach(async () => {
    // @ts-expect-error force History fallback
    delete (window as any).navigation
    vi.stubGlobal('scrollTo', vi.fn())
    history.replaceState(null, '', '/')
    document.head.innerHTML = '<title>Shell Title</title>'
    if (!routerMod) routerMod = await importRouter()
    else { routerMod.resetRoutes(); routerMod.navigate('/', { replace: true }) }
  })

  it('replaces the title when the new page mounts its Head', async () => {
    const { Router, navigate, defineRoutes } = routerMod
    const { Head } = await import('../../src/head')
    const root = document.createElement('div')

    function PageA() {
      return () => <div><Head><title>Title A</title></Head><p>A</p></div>
    }
    function PageB() {
      return () => <div><Head><title>Title B</title></Head><p>B</p></div>
    }
    const routes = defineRoutes([
      { path: '/a', component: PageA },
      { path: '/b', component: PageB },
    ])
    function App() { return () => <Router routes={routes} /> }

    navigate('/a')
    const app = createMemoApp(root, h(App as any))
    await new Promise<void>((r) => queueMicrotask(r))
    expect(document.title).toBe('Title A')

    navigate('/b')
    await new Promise<void>((r) => queueMicrotask(r))
    await new Promise<void>((r) => queueMicrotask(r))
    expect(root.textContent).toContain('B')
    expect(document.title).toBe('Title B')
    app.destroy()
  })
})
