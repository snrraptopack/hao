/** @jsxImportSource auwla */
/**
 * Layout persistence: navigating between routes that share a layout chain
 * must keep the layout instance (and its setup state) alive — only the page
 * remounts. See Router.tsx wrapWithLayouts / routes.ts routeLayouts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoApp, h } from '../../src'

let routerMod: Awaited<ReturnType<typeof importRouter>>

async function importRouter() {
  return import('../../src/router/index')
}

describe('layout persistence', () => {
  beforeEach(async () => {
    // @ts-expect-error — force History API fallback
    delete (window as any).navigation
    vi.stubGlobal('scrollTo', vi.fn())
    history.replaceState(null, '', '/')
    if (!routerMod) {
      routerMod = await importRouter()
    } else {
      routerMod.resetRoutes()
      routerMod.navigate('/', { replace: true })
    }
  })

  it('keeps the layout instance and its state across navigation', async () => {
    const { Router, navigate, defineRoutes } = routerMod
    const root = document.createElement('div')

    let layoutMounts = 0
    let pageAMounts = 0
    let pageBMounts = 0
    let clicks = 0

    function Shell(child: any) {
      layoutMounts++
      let local = 0
      return () => (
        <div class="shell">
          <button id="bump" onClick={() => { local++; clicks = local; }}>bump {local}</button>
          <main>{h(child, {})}</main>
        </div>
      )
    }
    function PageA() { pageAMounts++; return () => <p>page A</p> }
    function PageB() { pageBMounts++; return () => <p>page B</p> }

    const routes = defineRoutes([
      { path: '/lay/a', component: PageA, layouts: [Shell] },
      { path: '/lay/b', component: PageB, layouts: [Shell] },
    ])

    function App() {
      return () => <Router routes={routes} />
    }

    navigate('/lay/a')
    const app = createMemoApp(root, h(App as any))
    await new Promise<void>((r) => queueMicrotask(r))

    expect(root.textContent).toContain('page A')
    expect(layoutMounts).toBe(1)
    expect(pageAMounts).toBe(1)

    // Mutate layout-local state, then navigate.
    ;(root.querySelector('#bump') as HTMLButtonElement).click()
    await new Promise<void>((r) => queueMicrotask(r))
    expect(root.textContent).toContain('bump 1')

    navigate('/lay/b')
    await new Promise<void>((r) => queueMicrotask(r))
    await new Promise<void>((r) => queueMicrotask(r))

    expect(root.textContent).toContain('page B')
    expect(pageBMounts).toBe(1)
    // The layout was NOT remounted — its setup ran once and its state is intact.
    expect(layoutMounts).toBe(1)
    expect(pageAMounts).toBe(1)
    expect(root.textContent).toContain('bump 1')
    app.destroy()
  })

  it('group() attaches layouts as metadata instead of baking them in', async () => {
    const { group } = await import('../../src/router/routes')
    function Shell(child: any) { return () => <div>{h(child, {})}</div> }
    function Page() { return () => <p>x</p> }

    const routes = group('/admin', { layout: Shell as any }, [
      { path: '/', component: Page },
    ])

    expect(routes[0]!.layouts).toEqual([Shell])
    // The component itself must be untouched (no wrapper closure).
    expect(routes[0]!.component).toBe(Page)
  })
})
