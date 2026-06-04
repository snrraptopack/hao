// Router.tsx — native to the Auwla runtime.
//
// The Router is now a pure function of getCurrentPath(). It has no component
// handle, no commit() call, no registerRouter() — it simply reads the reactive
// path cell during each render pass. When the URL changes, the reactive cell
// invalidates every component that read it (the Router and any parent that
// called getCurrentPath() or isActive()), and the normal render loop takes
// over from there.

import {} from "auwla/jsx-runtime"
import { event } from "auwla/events"
import type { TrackHandle } from "auwla/events"
import { initNavigation, getCurrentPath, navigate, isPopNavigation } from "./navigation"
import { matchRoute, matchRoutes, normalizePath } from "./routes"
import { fireAfterEach } from "./hooks"
import type { Route, RouteContext, TypedTrackHandle } from "./types"

// ---------------------------------------------------------------------------
// Module-level route context
//
// Set during each Router render pass and read by child components via the
// getParams / getQuery / getLoaderHandle / getRouteMeta accessors below.
// Because Auwla renders depth-first and synchronously, the innermost Router
// that writes these values wins for its subtree — exactly what nested routing
// needs. They are module-level (not reactive cells) because child components
// read them during setup, not during an active render pass.
// ---------------------------------------------------------------------------

let _currentContext: RouteContext | null = null
let _currentLoader: TrackHandle | null = null
let _currentMeta: Record<string, unknown> | null = null

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
  // routes instead of the global registry.
  routes?: Route[]
}

export function Router(props: RouterProps = {}) {
  // Calling initNavigation() here is still needed — it registers the browser
  // event listeners the first time. It is idempotent, so re-renders are safe.
  // No component handle is captured; the reactive path cell in navigation.ts
  // handles invalidation automatically.
  initNavigation()

  // Per-instance state kept alive across re-renders by closure.
  let cachedPath: string | null = null
  let cachedLoader: TrackHandle | null = null

  const { routes } = props

  // The render closure. Re-runs whenever the reactive path cell changes (or
  // whenever a parent component re-renders and includes this component).
  return () => {
    // Reading getCurrentPath() here subscribes this render closure to the
    // reactive path cell. When the URL changes, this closure is re-run.
    const currentPath = getCurrentPath()
    const matched = routes ? matchRoutes(routes, currentPath) : matchRoute(currentPath)

    if (!matched) return <div>404 — page not found</div>

    const { route, params, query } = matched

    // Navigation guard
    const guard = route.beforeEnter || route.guard
    if (guard) {
      const context: RouteContext = { path: currentPath, params, query }
      const result = guard(context)
      if (result === false) return <div>403 — access denied</div>
      if (typeof result === "string") {
        // Defer so the redirect does not happen mid-render.
        Promise.resolve().then(() => navigate(result, { replace: true }))
        return <div>Redirecting…</div>
      }
    }

    // Capture the previous context so afterEach receives a correct `from`.
    const previousContext = _currentContext

    // Path changed — run one-time navigation side effects.
    if (cachedPath !== currentPath) {
      cachedPath = currentPath

      // Scroll to top on push/replace; let the browser restore position for pops.
      if (!isPopNavigation()) window.scrollTo(0, 0)

      _currentContext = { path: currentPath, params, query }
      _currentMeta = route.meta ?? null

      if (route.loader) {
        // event.track uses the fixed name '__loader' so that re-navigating to
        // a different route automatically cancels the previous in-flight request.
        // The handle is stored at module level so any component in the tree can
        // read it via getLoaderHandle() even during setup.
        cachedLoader = event.track("__loader", (signal) =>
          route.loader!(_currentContext!, signal)
        )
      } else {
        cachedLoader = null
      }

      fireAfterEach(previousContext, _currentContext)
    }

    // Always refresh the module-level accessors so nested routers and reused
    // component instances see the current match.
    _currentContext = { path: currentPath, params, query }
    _currentMeta = route.meta ?? null
    _currentLoader = cachedLoader

    // Loader fallbacks — re-evaluated on every render so they react to loader
    // state transitions (pending → resolved / rejected) automatically.
    if (cachedLoader?.pending && route.pendingComponent) {
      return route.pendingComponent()
    }
    if (cachedLoader?.rejected && route.errorComponent) {
      return route.errorComponent(cachedLoader.reason)
    }

    // Render the matched component through the JSX runtime so that
    // createComponentClosure manages its full lifecycle (correct IDs,
    // automatic cleanup on route changes, track scoping).
    //
    // The key includes loaderStatus so that when the loader transitions
    // (pending → resolved / rejected) the component gets a fresh instance.
    // Without this, createComponentClosure would serve the stale cached
    // instance.value (the pending-state UI) because the RouteComp ID is not
    // in the dirty set — only the Router's ID is.
    const RouteComp = route.component
    const loaderStatus = cachedLoader?.status ?? 'idle'
    return <RouteComp key={`${encodeURIComponent(currentPath)}:${loaderStatus}`} />
  }
}
