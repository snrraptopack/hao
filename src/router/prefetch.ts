/**
 * @fileoverview Prefetch registry for the auwla router.
 *
 * When `auwlaRouter({ lazy: true })` is used, the generated virtual module
 * exports a `__prefetch` map keyed by route path. Call `registerPrefetches()`
 * once in your app entry (after importing routes) to install it.
 *
 * Once registered, `<Link prefetch>` calls `prefetchRoute(href)` on
 * `mouseenter`, starting both the page chunk download and the `routed` data
 * fetch before the user clicks. By the time the click fires the module is
 * already cached and the data fetch is in flight.
 *
 * Usage:
 *
 *   import routes, { __prefetch } from 'auwla:routes'
 *   import { registerPrefetches }  from 'auwla/router'
 *
 *   registerPrefetches(__prefetch)
 */

import { pathToRegex } from './routes'

/** A map of route path → prefetch function, as exported by the virtual module. */
export type PrefetchMap = Record<string, () => Promise<unknown>>

/** Module-level registry. Only one instance per app. */
let _registry: PrefetchMap = {}

/**
 * Installs the prefetch map exported by `auwla:routes` (generated when
 * `auwlaRouter({ lazy: true })` is used).
 *
 * Call this once in your app entry, before mounting the Router:
 *
 *   import routes, { __prefetch } from 'auwla:routes'
 *   import { registerPrefetches } from 'auwla/router'
 *   registerPrefetches(__prefetch)
 */
export function registerPrefetches(map: PrefetchMap): void {
  _registry = map
}

/**
 * Triggers the prefetch function for the given route path.
 *
 * Called by `<Link prefetch>` on `mouseenter`. Safe to call on paths that
 * have no registered prefetch — it is a no-op in that case. Also safe to
 * call multiple times; the underlying `__load` cache makes it idempotent.
 *
 * The registry is keyed by route PATTERN ('/posts/:id') while Link passes the
 * RESOLVED url ('/posts/3?q=x'), so on an exact miss the registered patterns
 * are matched against the resolved path.
 *
 * @param path - The route path to prefetch (e.g. '/posts/:id').
 */
export function prefetchRoute(path: string): void {
  // Exact hit: static routes ('/about') and callers that already pass the
  // route pattern ('/posts/:id').
  let fn = _registry[path]

  if (!fn) {
    // Miss: `path` is a resolved url — find the registered pattern it matches.
    const pathname = path.split('?')[0]!
    for (const key of Object.keys(_registry)) {
      // Static keys can only match exactly — already ruled out above.
      if (!key.includes(':') && !key.includes('*')) continue
      if (pathToRegex(key).regex.test(pathname)) {
        fn = _registry[key]
        break
      }
    }
  }

  if (fn) {
    // Fire-and-forget. Errors are intentionally swallowed — a prefetch
    // failure should never crash the app; the user will see the real error
    // when they actually navigate.
    fn().catch(() => {/* swallowed */})
  }
}
