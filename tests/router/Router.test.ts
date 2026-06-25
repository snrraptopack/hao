import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoApp, h } from '../../src'
import { __resetTrackRegistry } from '../../src/track'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let routerMod: Awaited<ReturnType<typeof importRouter>>

async function importRouter() {
  return import('../../src/router/index')
}

describe('Router loading modes', () => {
  beforeEach(async () => {
    // @ts-expect-error — force History API fallback
    delete (window as any).navigation
    // Silence jsdom's "Not implemented: window.scrollTo" warnings.
    vi.stubGlobal('scrollTo', vi.fn())
    history.replaceState(null, '', '/')

    __resetTrackRegistry()
    if (!routerMod) {
      routerMod = await importRouter()
    } else {
      routerMod.resetRoutes()
      routerMod.navigate('/', { replace: true })
    }
  })

  it('suspend: keeps old page visible while loader resolves', async () => {
    const { Router, navigate, defineRoutes, getRouted } = routerMod
    const root = document.createElement('div')

    let resolveB: (value: string) => void
    const promiseB = new Promise<string>((resolve) => { resolveB = resolve })

    const routedB = async () => promiseB

    function PageA() {
      return () => h('div', { class: 'page-a' }, 'Page A')
    }

    function PageB() {
      const data = getRouted(routedB)
      return () => h('div', { class: 'page-b' }, `Page B: ${data?.value ?? 'no data'}`)
    }

    const routes = defineRoutes([
      { path: '/t1/a', component: PageA },
      { path: '/t1/b', component: PageB, routed: routedB },
    ])

    function App() {
      return () => h(Router as any, { routes, suspend: true })
    }

    navigate('/t1/a')
    const app = createMemoApp(root, h(App as any))
    expect(root.textContent).toBe('Page A')
    expect(document.documentElement.classList.contains('suspended')).toBe(false)

    navigate('/t1/b')
    app.render()

    // Still showing old page while suspended
    expect(root.textContent).toBe('Page A')
    expect(document.documentElement.classList.contains('suspended')).toBe(true)

    resolveB!('loaded')
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page B: loaded')
    expect(document.documentElement.classList.contains('suspended')).toBe(false)

    app.destroy()
  })

  it('suspend: renders errorComponent when loader rejects', async () => {
    const { Router, navigate, defineRoutes, getRouted, getRouteError } = routerMod
    const root = document.createElement('div')

    let rejectB: (reason: Error) => void
    const promiseB = new Promise<string>((_, reject) => { rejectB = reject })

    const routedB = async () => promiseB

    function PageA() {
      return () => h('div', {}, 'Page A')
    }

    function PageB() {
      const data = getRouted(routedB)
      return () => h('div', {}, `Page B: ${data?.value ?? 'no data'}`)
    }

    function ErrorB() {
      const err = getRouteError()
      return () => h('div', { class: 'error' }, `Error: ${String(err?.reason)}`)
    }

    const routes = defineRoutes([
      { path: '/t2/a', component: PageA },
      { path: '/t2/b', component: PageB, routed: routedB, errorComponent: ErrorB },
    ])

    function App() {
      return () => h(Router as any, { routes, suspend: true })
    }

    navigate('/t2/a')
    const app = createMemoApp(root, h(App as any))
    navigate('/t2/b')
    app.render()
    expect(root.textContent).toBe('Page A')

    rejectB!(new Error('boom'))
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Error: Error: boom')
    expect(document.documentElement.classList.contains('suspended')).toBe(false)

    app.destroy()
  })

  it('error component receives structured error and retry works', async () => {
    const { Router, navigate, defineRoutes, getRouted, getRouteError } = routerMod
    const root = document.createElement('div')

    let attempt = 0
    let resolveB: (value: string) => void
    let rejectB: (reason: Error) => void
    let promiseB: Promise<string>

    function makePromise() {
      attempt++
      return new Promise<string>((resolve, reject) => {
        resolveB = resolve
        rejectB = reject
      })
    }

    const routedB = async () => {
      promiseB = makePromise()
      return promiseB
    }

    function PageB() {
      const data = getRouted(routedB)
      return () => h('div', {}, `Page B: ${data?.value ?? 'no data'}`)
    }

    function ErrorB() {
      const err = getRouteError()
      return () => (
        h('div', { class: 'error' },
          `Error: ${err?.message}`,
          h('button', { onClick: () => err?.retry() }, 'Retry')
        )
      )
    }

    const routes = defineRoutes([
      { path: '/t6/b', component: PageB, routed: routedB, errorComponent: ErrorB },
    ])

    function App() {
      return () => h(Router as any, { routes })
    }

    navigate('/t6/b')
    const app = createMemoApp(root, h(App as any))
    expect(root.textContent).toBe('Page B: no data')

    rejectB!(new Error('first fail'))
    await sleep(10)
    app.render()

    expect(root.textContent).toContain('first fail')
    expect(attempt).toBe(1)

    const button = root.querySelector('button')!
    button.click()
    app.render()

    // Retry starts a new loader attempt
    expect(attempt).toBe(2)

    resolveB!('ok now')
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page B: ok now')

    app.destroy()
  })

  it('non-suspend: shows pendingComponent while loader resolves', async () => {
    const { Router, navigate, defineRoutes, getRouted } = routerMod
    const root = document.createElement('div')

    let resolveB: (value: string) => void
    const promiseB = new Promise<string>((resolve) => { resolveB = resolve })

    const routedB = async () => promiseB

    function PageA() {
      return () => h('div', {}, 'Page A')
    }

    function PageB() {
      const data = getRouted(routedB)
      return () => h('div', {}, `Page B: ${data?.value ?? 'no data'}`)
    }

    const routes = defineRoutes([
      { path: '/t3/a', component: PageA },
      {
        path: '/t3/b',
        component: PageB,
        routed: routedB,
        pendingComponent: () => h('div', { class: 'pending' }, 'Loading B...'),
      },
    ])

    function App() {
      return () => h(Router as any, { routes })
    }

    navigate('/t3/a')
    const app = createMemoApp(root, h(App as any))
    navigate('/t3/b')
    app.render()

    expect(root.textContent).toBe('Loading B...')
    expect(document.documentElement.classList.contains('suspended')).toBe(false)

    resolveB!('loaded')
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page B: loaded')

    app.destroy()
  })

  it('hard refresh in suspend mode shows global pendingComponent', async () => {
    const { Router, navigate, defineRoutes, getRouted } = routerMod
    const root = document.createElement('div')

    let resolveA: (value: string) => void
    const promiseA = new Promise<string>((resolve) => { resolveA = resolve })

    const routedA = async () => promiseA

    function GlobalPending() {
      return () => h('div', { class: 'global-pending' }, 'Global Loading...')
    }

    function PageA() {
      const data = getRouted(routedA)
      return () => h('div', {}, `Page A: ${data?.value ?? 'no data'}`)
    }

    const routes = defineRoutes([
      { path: '/t4/a', component: PageA, routed: routedA },
    ])

    function App() {
      return () => h(Router as any, { routes, suspend: true, pendingComponent: GlobalPending })
    }

    navigate('/t4/a', { replace: true })
    const app = createMemoApp(root, h(App as any))

    expect(root.textContent).toBe('Global Loading...')

    resolveA!('loaded')
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page A: loaded')

    app.destroy()
  })

  it('suspend: navigation from a pending initial route keeps the pending UI visible', async () => {
    const { Router, navigate, defineRoutes, getRouted } = routerMod
    const root = document.createElement('div')

    let resolveA: (value: string) => void
    const promiseA = new Promise<string>((resolve) => { resolveA = resolve })

    let resolveB: (value: string) => void
    const promiseB = new Promise<string>((resolve) => { resolveB = resolve })

    const routedA = async () => promiseA
    const routedB = async () => promiseB

    function PageA() {
      const data = getRouted(routedA)
      return () => h('div', {}, `Page A: ${data?.value ?? 'no data'}`)
    }

    function PageB() {
      const data = getRouted(routedB)
      return () => h('div', {}, `Page B: ${data?.value ?? 'no data'}`)
    }

    const routes = defineRoutes([
      {
        path: '/t5/a',
        component: PageA,
        routed: routedA,
        pendingComponent: () => h('div', { class: 'pending-a' }, 'Loading A...'),
      },
      { path: '/t5/b', component: PageB, routed: routedB },
    ])

    function App() {
      return () => h(Router as any, { routes, suspend: true })
    }

    navigate('/t5/a', { replace: true })
    const app = createMemoApp(root, h(App as any))
    expect(root.textContent).toBe('Loading A...')

    navigate('/t5/b')
    app.render()

    // Should stay on the previous (pending) UI while loading B
    expect(root.textContent).toBe('Loading A...')
    expect(document.documentElement.classList.contains('suspended')).toBe(true)

    resolveB!('loaded-b')
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page B: loaded-b')

    app.destroy()
  })
})
