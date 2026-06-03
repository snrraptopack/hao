// Router.tsx
import {} from "auwla/jsx-runtime"
import { component } from "auwla"
import { registerRouter, initNavigation, getCurrentPath, navigate } from "./navigation"
import { matchRoute } from "./routes"
import type { RouteContext } from "./types"

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

// Holds the context of the last matched route so useParams/useQuery/useLocation
// can be called from any component rendered inside the Router.
let _currentContext: RouteContext | null = null

// Simple render cache: avoid re-creating the component closure when the path
// has not changed.  Note that this is path-keyed, so a route whose component
// identity changes without a path change (e.g. HMR) still gets the old
// closure until the user navigates away and back.
let cachedPath: string | null = null
let cachedRender: (() => any) | null = null

// ---------------------------------------------------------------------------
// Composables
// ---------------------------------------------------------------------------

export function useParams(): Record<string, string> {
  return _currentContext?.params ?? {}
}

export function useQuery(): Record<string, string> {
  return _currentContext?.query ?? {}
}

export function useLocation(): string {
  return getCurrentPath()
}

// ---------------------------------------------------------------------------
// Router component
// ---------------------------------------------------------------------------

export function Router() {
  const self = component()
  // registerRouter and initNavigation are both idempotent — safe to call here
  // even though Router() itself is a component setup function that runs once.
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

    // Re-create the component closure only when the path actually changes.
    // `route.component` is guaranteed non-null by ResolvedRoute.
    if (cachedPath !== currentPath) {
      cachedPath = currentPath
      cachedRender = route.component()
    }

    return cachedRender!()
  }
}
