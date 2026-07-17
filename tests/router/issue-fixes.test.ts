/**
 * @fileoverview Regression tests for router issue fixes:
 *
 *   B10 — <Link prefetch> passed the RESOLVED url ('/posts/3?q=x') to
 *         prefetchRoute(), but the registry is keyed by route PATTERN
 *         ('/posts/:id') — prefetch never fired for dynamic routes.
 *
 *   B11 — The Router's no-match (404) branch returned before updating
 *         cachedPath, so navigating /a → 404 → /a skipped the whole
 *         path-change block on the second /a (no afterEach, stale context).
 *
 *   B12 — The navigation guard ran on EVERY Router re-render instead of once
 *         per path change, so a loader settling re-executed the guard.
 *
 *   B17 — Route patterns only accepted param names matching [a-zA-Z]+
 *         (':id2', ':user_id' failed) and static segments were interpolated
 *         into the RegExp unescaped (a literal '.' matched any character).
 *
 * Harness follows tests/router/Router.test.ts: History-API fallback forced,
 * manual app.render() after each navigate().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoApp, h } from '../../src'
import { __resetTrackRegistry } from '../../src/track'
import { matchRoutes, pathFor, pathToRegex } from '../../src/router/routes'
import { registerPrefetches, prefetchRoute } from '../../src/router/prefetch'
import type { Route } from '../../src/router/types'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let routerMod: Awaited<ReturnType<typeof importRouter>>

async function importRouter() {
  return import('../../src/router/index')
}

beforeEach(async () => {
  // @ts-expect-error — force History API fallback
  delete (window as any).navigation
  // Silence jsdom's "Not implemented: window.scrollTo" warnings.
  vi.stubGlobal('scrollTo', vi.fn())
  history.replaceState(null, '', '/')

  __resetTrackRegistry()
  registerPrefetches({})
  if (!routerMod) {
    routerMod = await importRouter()
  } else {
    routerMod.resetRoutes()
    routerMod.navigate('/', { replace: true })
  }
  routerMod.resetHooks()
})

// ---------------------------------------------------------------------------
// B17 — route pattern regex defects
// ---------------------------------------------------------------------------

describe('B17 — route pattern regex', () => {
  function Page() {
    return () => h('div', {}, 'x')
  }

  it('matches params with digits and underscores in their names', () => {
    const routes: Route[] = [
      { path: '/posts/:id2', component: Page },
      { path: '/users/:user_id', component: Page },
    ]

    expect(matchRoutes(routes, '/posts/42')?.params).toEqual({ id2: '42' })
    expect(matchRoutes(routes, '/users/7')?.params).toEqual({ user_id: '7' })
  })

  it('matches static segments literally — a dot is not a wildcard', () => {
    const routes: Route[] = [{ path: '/files/a.b', component: Page }]

    expect(matchRoutes(routes, '/files/a.b')).not.toBeNull()
    expect(matchRoutes(routes, '/files/axb')).toBeNull()
  })

  it('still matches catch-all wildcards', () => {
    const routes: Route[] = [{ path: '*', component: Page }]

    expect(matchRoutes(routes, '/anything/at/all')).not.toBeNull()
  })

  it('pathFor interpolates params with digits and underscores', () => {
    expect(pathFor('/posts/:id2', { id2: '3' })).toBe('/posts/3')
    expect(pathFor('/users/:user_id', { user_id: '9' })).toBe('/users/9')
  })

  it('memoizes compiled regexes per path', () => {
    expect(pathToRegex('/memo/:id')).toBe(pathToRegex('/memo/:id'))
  })
})

// ---------------------------------------------------------------------------
// B10 — Link prefetch on dynamic routes
// ---------------------------------------------------------------------------

describe('B10 — Link prefetch on dynamic routes', () => {
  it('fires the pattern-keyed prefetch when hovering a resolved dynamic href', async () => {
    const { Link } = routerMod
    const prefetchFn = vi.fn().mockResolvedValue(undefined)
    registerPrefetches({ '/posts/:id': prefetchFn })

    const root = document.createElement('div')
    const app = createMemoApp(
      root,
      h(Link as any, { href: '/posts/:id', params: { id: '3' }, query: { q: 'x' } }, 'View post'),
    )

    const anchor = root.querySelector('a')!
    // Sanity: the anchor points at the RESOLVED url.
    expect(anchor.getAttribute('href')).toBe('/posts/3?q=x')

    anchor.dispatchEvent(new MouseEvent('mouseenter'))
    await Promise.resolve()

    expect(prefetchFn).toHaveBeenCalledOnce()

    app.destroy()
  })

  it('prefetchRoute resolves a registered pattern from a resolved url', async () => {
    const prefetchFn = vi.fn().mockResolvedValue(undefined)
    registerPrefetches({ '/posts/:id': prefetchFn })

    prefetchRoute('/posts/3?q=x')
    await Promise.resolve()

    expect(prefetchFn).toHaveBeenCalledOnce()
  })

  it('keeps static-route behaviour — exact key hit, no-op for unknown paths', async () => {
    const prefetchFn = vi.fn().mockResolvedValue(undefined)
    registerPrefetches({ '/about': prefetchFn })

    prefetchRoute('/about')
    await Promise.resolve()
    expect(prefetchFn).toHaveBeenCalledOnce()

    // Unrelated resolved urls must not trigger the static entry.
    expect(() => prefetchRoute('/about/us')).not.toThrow()
    await Promise.resolve()
    expect(prefetchFn).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// B11 — 404 navigation bookkeeping
// ---------------------------------------------------------------------------

describe('B11 — 404 navigation bookkeeping', () => {
  it('navigating a → 404 → a re-runs the path-change block (afterEach fires)', async () => {
    const { Router, navigate, defineRoutes, afterEach } = routerMod
    const root = document.createElement('div')

    const afterEachSpy = vi.fn()
    afterEach(afterEachSpy)

    const loaderA = vi.fn(async () => 'data-a')

    function PageA() {
      return () => h('div', { class: 'page-a' }, 'Page A')
    }

    const routes = defineRoutes([
      { path: '/fix11/a', component: PageA, routed: loaderA },
    ])

    function App() {
      return () => h(Router as any, { routes })
    }

    navigate('/fix11/a')
    const app = createMemoApp(root, h(App as any))
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page A')
    expect(afterEachSpy).toHaveBeenCalledTimes(1)
    expect(afterEachSpy.mock.lastCall?.[1]?.path).toBe('/fix11/a')

    // Navigate to an unknown path — 404.
    navigate('/fix11/bad')
    app.render()
    expect(root.textContent).toBe('404 — page not found')
    // The 404 itself is not a committed route navigation — no afterEach.
    expect(afterEachSpy).toHaveBeenCalledTimes(1)

    // Navigate back to /a. Without the fix, cachedPath was never updated to
    // '/fix11/bad', so '/fix11/a' compares equal against the stale cachedPath
    // and the whole path-change block is skipped — no afterEach fires.
    navigate('/fix11/a')
    app.render()
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page A')
    expect(afterEachSpy).toHaveBeenCalledTimes(2)
    expect(afterEachSpy.mock.lastCall?.[1]?.path).toBe('/fix11/a')
    // The 404 cleared the stale context, so `from` is null again (like the
    // very first navigation).
    expect(afterEachSpy.mock.lastCall?.[0]).toBeNull()

    app.destroy()
  })
})

// ---------------------------------------------------------------------------
// B12 — guards run once per navigation
// ---------------------------------------------------------------------------

describe('B12 — guards run once per navigation', () => {
  it('a sync guard is not re-run when the async loader settles', async () => {
    const { Router, navigate, defineRoutes } = routerMod
    const root = document.createElement('div')

    const guardSpy = vi.fn(() => true)
    let resolveLoader: (value: string) => void
    const loaderPromise = new Promise<string>((resolve) => { resolveLoader = resolve })
    const routedSpy = vi.fn(async () => loaderPromise)

    function PageA() {
      return () => h('div', {}, 'Page A')
    }

    function PageB() {
      return () => h('div', {}, 'Page B')
    }

    const routes = defineRoutes([
      { path: '/fix12/a', component: PageA },
      { path: '/fix12/b', component: PageB, guard: guardSpy, routed: routedSpy },
    ])

    function App() {
      return () => h(Router as any, { routes })
    }

    navigate('/fix12/a')
    const app = createMemoApp(root, h(App as any))
    expect(root.textContent).toBe('Page A')

    navigate('/fix12/b')
    app.render()
    expect(guardSpy).toHaveBeenCalledTimes(1)

    // Settle the loader — the Router re-renders (it subscribes to the
    // loader's status cell). The guard must NOT run again.
    resolveLoader!('data')
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page B')
    expect(guardSpy).toHaveBeenCalledTimes(1)
    expect(routedSpy).toHaveBeenCalledTimes(1)

    app.destroy()
  })

  it('an async guard is not re-run when its own verdict settles', async () => {
    const { Router, navigate, defineRoutes } = routerMod
    const root = document.createElement('div')

    let resolveGuard: (value: boolean) => void
    const guardPromise = new Promise<boolean>((resolve) => { resolveGuard = resolve })
    const guardSpy = vi.fn(() => guardPromise)

    function PageA() {
      return () => h('div', {}, 'Page A')
    }

    function PageB() {
      return () => h('div', {}, 'Page B')
    }

    const routes = defineRoutes([
      { path: '/fix12c/a', component: PageA },
      { path: '/fix12c/b', component: PageB, guard: guardSpy },
    ])

    function App() {
      return () => h(Router as any, { routes, suspend: true })
    }

    navigate('/fix12c/a')
    const app = createMemoApp(root, h(App as any))
    expect(root.textContent).toBe('Page A')

    navigate('/fix12c/b')
    app.render()
    expect(guardSpy).toHaveBeenCalledTimes(1)
    expect(document.documentElement.classList.contains('suspended')).toBe(true)

    resolveGuard!(true)
    await sleep(10)
    app.render()

    expect(root.textContent).toBe('Page B')
    expect(guardSpy).toHaveBeenCalledTimes(1)

    app.destroy()
  })

  it('guard returning true allows rendering; false renders 403', async () => {
    const { Router, navigate, defineRoutes } = routerMod
    const root = document.createElement('div')

    function Ok() {
      return () => h('div', {}, 'Ok Page')
    }

    function Secret() {
      return () => h('div', {}, 'Secret Page')
    }

    const routes = defineRoutes([
      { path: '/fix12b/ok', component: Ok, guard: () => true },
      { path: '/fix12b/secret', component: Secret, guard: () => false },
    ])

    function App() {
      return () => h(Router as any, { routes })
    }

    navigate('/fix12b/ok')
    const app = createMemoApp(root, h(App as any))
    expect(root.textContent).toBe('Ok Page')

    navigate('/fix12b/secret')
    app.render()
    expect(root.textContent).toBe('403 — access denied')

    // Navigating back re-evaluates the guard — the cached verdict for the
    // blocked path must not leak onto the allowed one (and vice versa).
    navigate('/fix12b/ok')
    app.render()
    expect(root.textContent).toBe('Ok Page')

    app.destroy()
  })
})
