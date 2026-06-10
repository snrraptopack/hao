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
import { enterSuspense, exitSuspense, configureSuspense } from "./suspend"
import type { SuspendConfig } from "./suspend"
import type { Route, RouteContext, TypedTrackHandle, MatchedRoute } from "./types"

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
let _pendingContext: RouteContext | null = null
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
  /**
   * When true, navigating to a route with a loader will defer rendering the
   * new route component until the loader resolves. While suspended, a global
   * CSS class is applied to `<html>` so the application can dim opacity or
   * show loading chrome.
   *
   * If an object is provided, it configures suspension behaviour:
   *   - className: CSS class added to `<html>` (default: 'suspended')
   *   - attr: data attribute name added to `<html>` (default: 'data-suspended')
   */
  suspend?: boolean | SuspendConfig
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
  let previousMatched: MatchedRoute | null = null
  let isSuspended = false
  // The exact key prop used for the most recently rendered RouteComp.
  // Preserved when suspension starts so we can render <PrevComp key={suspendPrevKey} />
  // and hit the existing instance in the component cache — preventing re-setup
  // and keeping the already-resolved loader data visible during the transition.
  let suspendPrevKey: string | null = null
  // The loader handle that was active before suspension started. Passed as
  // _currentLoader while the old component is being shown so that any
  // getLoaderHandle() call during that render sees the resolved data.
  let prevCachedLoader: TrackHandle | null = null

  const { routes, suspend } = props
  const suspendEnabled = !!suspend

  if (suspend && typeof suspend === 'object') {
    configureSuspense(suspend)
  }

  // The render closure. Re-runs whenever the reactive path cell changes (or
  // whenever a parent component re-renders and includes this component).
  return () => {
    // Reading getCurrentPath() here subscribes this render closure to the
    // reactive path cell. When the URL changes, this closure is re-run.
    const currentPath = getCurrentPath()
    const matched = routes ? matchRoutes(routes, currentPath) : matchRoute(currentPath)

    if (!matched) {
      if (isSuspended) { exitSuspense(); isSuspended = false }
      previousMatched = null
      return <div>404 — page not found</div>
    }

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
      // Save the previous path BEFORE overwriting cachedPath. We need it to
      // reconstruct the key that was used to render the previous RouteComp so
      // the component cache serves the existing instance during suspension.
      const prevPath = cachedPath
      cachedPath = currentPath

      // Scroll to top on push/replace; let the browser restore position for pops.
      if (!isPopNavigation()) window.scrollTo(0, 0)

      const nextContext: RouteContext = { path: currentPath, params, query }

      if (suspendEnabled && route.loader && !isSuspended) {
        // Enter suspension: start the loader but keep the current route visible.
        isSuspended = true
        enterSuspense()
        _pendingContext = nextContext

        // Snapshot the key and loader from the previous render so the suspension
        // branch can render <PrevComp key={suspendPrevKey} /> and reuse the
        // cached instance — preserving the resolved data the user is looking at.
        suspendPrevKey = prevPath !== null
          ? `${encodeURIComponent(prevPath)}:${cachedLoader?.status ?? 'idle'}`
          : null
        prevCachedLoader = cachedLoader

        cachedLoader = event.track("__loader", (signal) =>
          route.loader!(_pendingContext!, signal)
        )
      } else {
        if (isSuspended) {
          // Navigating away from a suspended state — clean up.
          exitSuspense()
          isSuspended = false
          _pendingContext = null
          suspendPrevKey = null
          prevCachedLoader = null
          cachedLoader?.cancel()
        }
        _currentContext = nextContext
        _currentMeta = route.meta ?? null

        if (route.loader) {
          cachedLoader = event.track("__loader", (signal) =>
            route.loader!(_currentContext!, signal)
          )
        } else {
          cachedLoader = null
        }
      }

      fireAfterEach(previousContext, nextContext)
    }

    // Check if an active suspension has just resolved or rejected.
    if (isSuspended && cachedLoader && !cachedLoader.pending) {
      isSuspended = false
      exitSuspense()
      _currentContext = _pendingContext!
      _pendingContext = null
      suspendPrevKey = null
      prevCachedLoader = null
      // Fall through to normal render with the now-resolved loader.
    }

    // During suspension, keep showing the previously matched route so the user
    // still sees content (dimmed via global CSS) while data loads.
    if (isSuspended) {
      // Expose the new pending loader for any route.pendingComponent that needs it.
      _currentLoader = cachedLoader

      if (route.pendingComponent) {
        return route.pendingComponent()
      }

      if (previousMatched) {
        const PrevComp = previousMatched.route.component
        // Restore the previous (resolved) loader BEFORE rendering the old component
        // so that getLoaderHandle() inside it returns the correct data.
        // Using suspendPrevKey is what actually prevents re-setup: it matches the
        // key from the last normal render, so createComponentClosure finds the
        // existing instance in the cache and skips setup entirely.
        _currentLoader = prevCachedLoader
        return suspendPrevKey !== null
          ? <PrevComp key={suspendPrevKey} />
          : <PrevComp />
      }

      // First-ever render and it has a loader — nothing previous to show.
      return <div>Loading…</div>
    }

    // Normal render path — refresh accessors for the current match.
    _currentContext = { path: currentPath, params, query }
    _currentMeta = route.meta ?? null
    _currentLoader = cachedLoader

    // Loader fallbacks — re-evaluated on every render so they react to loader
    // state transitions (pending → resolved / rejected) automatically.
    // These only fire when suspend is NOT enabled; with suspend, the blocking
    // behaviour above handles pending states.
    if (!suspendEnabled) {
      if (cachedLoader?.pending && route.pendingComponent) {
        return route.pendingComponent()
      }
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
    const output = <RouteComp key={`${encodeURIComponent(currentPath)}:${loaderStatus}`} />

    // Cache this match so it can be kept visible during a future suspension.
    previousMatched = matched
    return output
  }
}
