// Router.tsx
import {} from "auwla/jsx-runtime"
import { component } from "auwla"
import { event } from "auwla/events"
import type { TrackHandle } from "auwla/events"
import { registerRouter, initNavigation, getCurrentPath, navigate, isPopNavigation } from "./navigation"
import { matchRoute, normalizePath } from "./routes"
import { fireAfterEach } from "./hooks"
import type { RouteContext, TypedTrackHandle } from "./types"

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

// Holds the context of the last matched route so getParams/getQuery/getLocation
// can be called from any component rendered inside the Router.
let _currentContext: RouteContext | null = null

// The track handle for the currently active route's loader, or null if the
// matched route has no loader. Reactive: its getters always read from the live
// track registry, so reading handle.pending / handle.value in any render
// closure — including setup scope — reflects the real-time async state.
let _currentLoader: TrackHandle | null = null

// Holds the meta object of the last matched route, or null if the route
// defines no meta. Read via getRouteMeta().
let _currentMeta: Record<string, unknown> | null = null

// Simple render cache: avoid re-creating the component closure when the path
// has not changed. Note that this is path-keyed, so a route whose component
// identity changes without a path change (e.g. HMR) still gets the old
// closure until the user navigates away and back.
let cachedPath: string | null = null
let cachedRender: (() => any) | null = null

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

// Returns the TrackHandle for the current route's loader, typed to T so
// .value is T | undefined instead of unknown. The handle is reactive:
// reading .pending / .resolved / .value inside a render closure reflects
// the loader's live state on every render pass without any extra wiring.
// Returns null if the matched route defines no loader.
export function getLoaderHandle<T = unknown>(): TypedTrackHandle<T> | null {
  return _currentLoader as TypedTrackHandle<T> | null
}

// Returns the meta object of the currently matched route cast to T.
// T defaults to Record<string, unknown> — narrow it at the call site when
// you know the shape: getRouteMeta<{ requiresAuth: boolean }>()
export function getRouteMeta<T extends Record<string, unknown> = Record<string, unknown>>(): T {
  return (_currentMeta ?? {}) as T
}

// Returns true when the current location matches `path` exactly OR when the
// current path starts with `path` at a segment boundary.
// Example: isActive('/posts') is true on /posts and /posts/42, but not on /posts-archive.
export function isActive(path: string): boolean {
  const current = normalizePath(getCurrentPath().split('?')[0]!)
  const target  = normalizePath(path)
  return current === target || current.startsWith(target + '/')
}

// Returns true only when the current location matches `path` exactly
// (query string is ignored).
export function isExactActive(path: string): boolean {
  return normalizePath(getCurrentPath().split('?')[0]!) === normalizePath(path)
}

// ---------------------------------------------------------------------------
// Router component
// ---------------------------------------------------------------------------

export function Router() {
  const self = component()
  // Both calls are idempotent — safe even if Router() were ever called again.
  registerRouter(self)
  initNavigation()

  return () => {
    const currentPath = getCurrentPath()
    const matched = matchRoute(currentPath)

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
