// routes.ts
import type { Route, ResolvedRoute, MatchedRoute, GroupOptions, PathParams } from "./types"

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

// Module-level registry of all flattened, registered routes.
const registry: Route[] = []

/**
 * Registers routes in the global registry and returns the flattened list.
 * Use `const` type parameter so literal paths (including `:params`) are
 * preserved for type inference.
 */
export function defineRoutes<const T extends Route[]>(routes: T): T {
  registry.push(...flattenRoutes(routes))
  return routes
}

// Wipes the registry clean.  Call this in tests or on HMR reloads to avoid
// duplicate or phantom routes accumulating across hot reloads.
export function resetRoutes(): void {
  registry.length = 0
}

// ---------------------------------------------------------------------------
// Route flattening
// ---------------------------------------------------------------------------

/**
 * Recursively flattens nested route definitions into a single-depth list.
 *
 * Behaviour for parent routes that have children:
 *   - If the parent has its own `component`, it is kept as a standalone
 *     entry (useful for layout/index routes).
 *   - Children are always flattened under the parent's full path.
 *   - The `children` array is stripped from the parent entry that is kept
 *     so that the registry never holds nested structures.
 */
export function flattenRoutes(routes: Route[], prefix = ""): Route[] {
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
  return { regex: new RegExp(`^${pattern}\\/?$`), keys }
}

// Returns the first route that matches `pathname` and has a component.
// Routes without a component (grouping/prefix-only routes) are skipped.
// Wildcard routes are always evaluated last.
export function matchRoutes(routes: Route[], pathname: string): MatchedRoute | null {
  const [pathOnly, queryString] = pathname.split("?")
  const query = parseQuery(queryString ?? "")

  // Sort so wildcard catch-alls are always tried last.
  const sorted = [...routes].sort((a, b) =>
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

export function matchRoute(pathname: string): MatchedRoute | null {
  return matchRoutes(registry, pathname)
}

// ---------------------------------------------------------------------------
// Route composition
// ---------------------------------------------------------------------------

/**
 * Groups routes under a shared base path and optionally applies a layout
 * wrapper and/or guard to every route in the group.
 *
 * Example:
 *   group('/admin', { layout: AppShell, guard: isAdmin }, [
 *     { path: '/', component: AdminHome },
 *     { path: '/users', component: AdminUsers },
 *   ])
 *   // => [{ path: '/admin', component: wrapped(AdminHome), guard: ... },
 *   //     { path: '/admin/users', component: wrapped(AdminUsers), guard: ... }]
 */
export function group(base: string, options: GroupOptions, routes: Route[]): Route[] {
  const { layout, guard } = options
  const flat = flattenRoutes(routes, base)

  return flat.map((route) => {
    const r: Route = { ...route }

    // Apply layout wrapper around the component.
    if (layout && r.component) {
      const original = r.component
      r.component = () => layout(original)
    }

    // Merge guard with existing beforeEnter/guard.
    if (guard) {
      const existing = r.beforeEnter || r.guard
      if (existing) {
        r.guard = (ctx) => {
          const result = existing(ctx)
          if (result !== true && result !== undefined) return result
          return guard(ctx)
        }
      } else {
        r.guard = guard
      }
    }

    return r
  })
}

/**
 * Concatenates multiple route arrays into one flat list.
 * Order matters — earlier routes match first.
 */
export function composeRoutes(...lists: Route[][]): Route[] {
  return lists.flat()
}

// ---------------------------------------------------------------------------
// URL building
// ---------------------------------------------------------------------------

/**
 * Builds a URL from a pattern, replacing `:param` segments with the provided
 * values and optionally appending a query string.
 *
 * Example:
 *   pathFor('/users/:id', { id: 42 })           // => '/users/42'
 *   pathFor('/search', {}, { q: 'hello' })      // => '/search?q=hello'
 */
export function pathFor<
  P extends string
>(
  pattern: P,
  params?: PathParams<P>,
  query?: Record<string, string | number | boolean>
): string {
  let url = pattern
    .replace(/:([a-zA-Z]+)/g, (_, key) => {
      const value = (params as Record<string, string | number | boolean>)?.[key]
      return value !== undefined ? encodeURIComponent(String(value)) : `:${key}`
    })

  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)])
    ).toString()
    url += (url.includes('?') ? '&' : '?') + qs
  }

  return url
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseQuery(qs: string): Record<string, string> {
  if (!qs) return {}
  return Object.fromEntries(new URLSearchParams(qs))
}
