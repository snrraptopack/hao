// routes.ts
import type { Route, ResolvedRoute, MatchedRoute } from "./types"

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

// Module-level registry of all flattened, registered routes.
const registry: Route[] = []

export function defineRoutes(routes: Route[]): void {
  registry.push(...flattenRoutes(routes))
}

// Wipes the registry clean.  Call this in tests or on HMR reloads to avoid
// duplicate or phantom routes accumulating across hot reloads.
export function resetRoutes(): void {
  registry.length = 0
}

// ---------------------------------------------------------------------------
// Route flattening
// ---------------------------------------------------------------------------

// Recursively flattens nested route definitions into a single-depth list.
//
// Behaviour for parent routes that have children:
//   - If the parent has its own `component`, it is kept as a standalone
//     entry (useful for layout/index routes).
//   - Children are always flattened under the parent's full path.
//   - The `children` array is stripped from the parent entry that is kept
//     so that the registry never holds nested structures.
function flattenRoutes(routes: Route[], prefix = ""): Route[] {
  const flat: Route[] = []

  for (const route of routes) {
    const fullPath = normalizePath(prefix + route.path)

    if (route.children?.length) {
      // Keep the parent as its own renderable route if it has a component.
      if (route.component) {
        flat.push({ ...route, path: fullPath, children: undefined })
      }
      flat.push(...flattenRoutes(route.children, fullPath))
    } else {
      flat.push({ ...route, path: fullPath })
    }
  }

  return flat
}

export function normalizePath(path: string): string {
  return "/" + path.replace(/^\/+|\/+$/g, "")
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function pathToRegex(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = []
  const pattern = path
    .replace(/\//g, "\\/")
    .replace(/:([a-zA-Z]+)/g, (_, key) => {
      keys.push(key)
      return "([^/]+)"
    })
    .replace(/\*/g, ".*")
  return { regex: new RegExp(`^${pattern}$`), keys }
}

// Returns the first route that matches `pathname` and has a component.
// Routes without a component (grouping/prefix-only routes) are skipped.
// Wildcard routes are always evaluated last.
export function matchRoute(pathname: string): MatchedRoute | null {
  const [pathOnly, queryString] = pathname.split("?")
  const query = parseQuery(queryString ?? "")

  // Sort so wildcard catch-alls are always tried last.
  const sorted = [...registry].sort((a, b) =>
    a.path === "*" ? 1 : b.path === "*" ? -1 : 0
  )

  for (const route of sorted) {
    // Only renderable routes are eligible — skip grouping/prefix-only entries.
    if (!route.component) continue

    const { regex, keys } = pathToRegex(route.path)
    const match = pathOnly?.match(regex)
    if (match) {
      const params: Record<string, string> = {}
      keys.forEach((key, i) => (params[key] = match[i + 1] ?? ""))
      // Safe cast: we verified route.component is defined above.
      return { route: route as ResolvedRoute, params, query }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseQuery(qs: string): Record<string, string> {
  if (!qs) return {}
  return Object.fromEntries(new URLSearchParams(qs))
}
