// Router.tsx
import {} from "auwla/jsx-runtime"
import { component } from "auwla"
import { event } from "auwla/events"
import type { TrackHandle } from "auwla/events"
import { registerRouter, initNavigation, getCurrentPath, navigate } from "./navigation"
import { matchRoute } from "./routes"
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
        // Defer the redirect so it does not happen mid-render.
        Promise.resolve().then(() => navigate(result))
        return <div>Redirecting…</div>
      }
    }

    _currentContext = { path: currentPath, params, query }

    // React to path changes: start the loader and create the component closure.
    if (cachedPath !== currentPath) {
      cachedPath = currentPath

      if (route.loader) {
        // event.track uses the fixed name '__loader' so that re-navigating to
        // a different route automatically cancels the previous in-flight
        // request (track auto-cancels same-named active tracks before starting
        // a new one). The handle is stored at module level so any component
        // in the tree can read it via getLoaderHandle() — even during setup.
        const context: RouteContext = { path: currentPath, params, query }
        _currentLoader = event.track("__loader", (signal) =>
          route.loader!(context, signal)
        )
      } else {
        _currentLoader = null
      }

      // `route.component` is guaranteed non-null by ResolvedRoute.
      cachedRender = route.component()
    }

    return cachedRender!()
  }
}
