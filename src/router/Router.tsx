// Router.tsx
import {} from "auwla/jsx-runtime"
import { component } from "auwla"
import { event } from "auwla/events"
import type { TrackHandle } from "auwla/events"
import { registerRouter, initNavigation, getCurrentPath, navigate, isPopNavigation } from "./navigation"
import { matchRoute, matchRoutes, normalizePath } from "./routes"
import { fireAfterEach } from "./hooks"
import type { Route, RouteContext, TypedTrackHandle } from "./types"

// ---------------------------------------------------------------------------
// Module-level state
//
// These are read by the route context accessors so any component in the tree
// can call getParams/getQuery/getLoaderHandle/getRouteMeta without passing
// props. When nested routers are used, the innermost router wins — which is
// the desired behaviour because its match is the one currently rendering.
// ---------------------------------------------------------------------------

let _currentContext: RouteContext | null = null
let _currentLoader: TrackHandle | null = null
let _currentMeta: Record<string, unknown> | null = null

// ---------------------------------------------------------------------------
// Route context accessors
//
// Plain functions — no hook rules, no call-order restrictions.
// They simply read from the module-level context set by the last match.
// ---------------------------------------------------------------------------

export function getParams(): Record<string, string> {
  return _currentContext?.params ?? {}
}

export function getQuery(): Record<string, string> {
  return _currentContext?.query ?? {}
}

export function getLocation(): string {
  return getCurrentPath()
}

export function getLoaderHandle<T = unknown>(): TypedTrackHandle<T> | null {
  return _currentLoader as TypedTrackHandle<T> | null
}

export function getRouteMeta<T extends Record<string, unknown> = Record<string, unknown>>(): T {
  return (_currentMeta ?? {}) as T
}

export function isActive(path: string): boolean {
  const current = normalizePath(getCurrentPath().split('?')[0]!)
  const target  = normalizePath(path)
  return current === target || current.startsWith(target + '/')
}

export function isExactActive(path: string): boolean {
  return normalizePath(getCurrentPath().split('?')[0]!) === normalizePath(path)
}

// ---------------------------------------------------------------------------
// Router component
// ---------------------------------------------------------------------------

export type RouterProps = {
  // Optional local route set. When provided the Router matches against these
  // routes instead of the global registry. Useful for nested / namespaced
  // routing inside a parent Router.
  routes?: Route[]
  // Optional base path stripped from the current location before matching.
  // Example: base="/child" with location "/child/users" matches against "/users".
  base?: string
}

export function Router(props: RouterProps = {}) {
  const self = component()
  // Both calls are idempotent — safe even if Router() were ever called again.
  registerRouter(self)
  initNavigation()

  // Instance-local render cache so nested Routers don't clobber each other.
  let cachedPath: string | null = null
  let cachedRender: (() => any) | null = null

  const { routes, base } = props

  return () => {
    let currentPath = getCurrentPath()

    // Strip base prefix (if any) while preserving query string.
    if (base) {
      const baseNormalized = normalizePath(base)
      const [pathOnly, queryString] = currentPath.split('?')
      if (pathOnly!.startsWith(baseNormalized)) {
        const relativePath = pathOnly!.slice(baseNormalized.length) || '/'
        currentPath = relativePath + (queryString ? '?' + queryString : '')
      }
    }

    const matched = routes ? matchRoutes(routes, currentPath) : matchRoute(currentPath)

    if (!matched) return <div>404 — page not found</div>

    const { route, params, query } = matched

    // Run the navigation guard if one is defined for this route.
    if (route.beforeEnter) {
      const context: RouteContext = { path: currentPath, params, query }
      const result = route.beforeEnter(context)
      if (result === false) return <div>403 — access denied</div>
      if (typeof result === "string") {
        // Use replace so the guarded route is not pushed onto the back stack.
        // Defer so the redirect does not happen mid-render.
        Promise.resolve().then(() => navigate(result, { replace: true }))
        return <div>Redirecting…</div>
      }
    }

    // Capture the previous context before overwriting it so afterEach can
    // receive a proper `from` value (null on the very first navigation).
    const previousContext = _currentContext

    _currentContext = { path: currentPath, params, query }
    _currentMeta = route.meta ?? null

    // React to path changes: start the loader and create the component closure.
    if (cachedPath !== currentPath) {
      cachedPath = currentPath

      // Scroll to the top of the page on push/replace navigations.
      // Back/forward (isPopNavigation) let the browser restore its own position.
      if (!isPopNavigation()) window.scrollTo(0, 0)

      if (route.loader) {
        // event.track uses the fixed name '__loader' so that re-navigating to
        // a different route automatically cancels the previous in-flight
        // request (track auto-cancels same-named active tracks before starting
        // a new one). The handle is stored at module level so any component
        // in the tree can read it via getLoaderHandle() — even during setup.
        _currentLoader = event.track("__loader", (signal) =>
          route.loader!(_currentContext!, signal)
        )
      } else {
        _currentLoader = null
      }

      // `route.component` is guaranteed non-null by ResolvedRoute.
      cachedRender = route.component()

      // Notify afterEach hooks with full route context after the render is set up.
      fireAfterEach(previousContext, _currentContext)
    }

    // Route-level loader fallbacks — checked on every render so they react
    // to loader state transitions (pending → resolved/rejected) automatically.
    if (_currentLoader?.pending && route.pendingComponent) {
      return route.pendingComponent()
    }
    if (_currentLoader?.rejected && route.errorComponent) {
      return route.errorComponent(_currentLoader.reason)
    }

    return cachedRender!()
  }
}
