// Router.tsx
import {} from "auwla/jsx-runtime"
import { component } from "auwla"
import { registerRouter, initNavigation, getCurrentPath, navigate } from "./navigation"
import { matchRoute } from "./routes"
import type { RouteContext } from "./types"

let _currentContext: RouteContext | null = null
let cachedPath: string | null = null
let cachedRender: (() => any) | null = null

export function useParams(): Record<string, string> {
  return _currentContext?.params ?? {}
}

export function useQuery(): Record<string, string> {
  return _currentContext?.query ?? {}
}

export function useLocation(): string {
  return getCurrentPath()
}

export function Router() {
  const self = component()
  registerRouter(self)
  initNavigation()

  return () => {
    const currentPath = getCurrentPath()
    const matched = matchRoute(currentPath)
    console.log("path:", currentPath, "matched:", matched)
    if (!matched) return <div>404 — page not found</div>

    const { route, params, query } = matched

    if (route.beforeEnter) {
      const context: RouteContext = { path: currentPath, params, query }
      const result = route.beforeEnter(context)
      if (result === false) return <div>403 — access denied</div>
      if (typeof result === "string") {
        Promise.resolve().then(() => navigate(result))
        return <div>Redirecting...</div>
      }
    }

    _currentContext = { path: currentPath, params, query }

    if (cachedPath !== currentPath) {
      cachedPath = currentPath
      cachedRender = route.component()
    }

    return cachedRender!()
  }
}
