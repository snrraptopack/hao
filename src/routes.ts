import type { Route, RouteGuard, QueryParams, PathParams } from './router'

// Join base and child paths with a single slash
function joinPaths(base: string, child: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  const c = child.startsWith('/') ? child : `/${child}`
  return `${b}${c}` || '/'
}

/**
 * Define a route array while preserving literal path types.
 *
 * Example:
 * ```ts
 * const routes = defineRoutes([
 *   { path: '/', component: () => <h1>Home</h1> },
 *   { path: '/users/:id', component: (p) => <div>User {p!.id}</div>, name: 'user' },
 * ])
 * ```
 */
export function defineRoutes<R extends Route<any>[]>(routes: [...R]): [...R] {
  return routes
}

// Compose multiple route arrays into one
/**
 * Compose several route arrays into a single list.
 *
 * Example:
 * ```ts
 * const userRoutes = defineRoutes([
 *   { path: '/users', component: UsersPage },
 *   { path: '/users/:id', component: (p) => UserDetail(p!.id) },
 * ])
 * const adminRoutes = defineRoutes([
 *   { path: '/admin', component: AdminHome },
 * ])
 *
 * const routes = composeRoutes(userRoutes, adminRoutes)
 * ```
 */
export function composeRoutes(
  ...sources: Array<ReadonlyArray<Route<any>>>
): Route<any>[] {
  const out: Route<any>[] = []
  for (const src of sources) {
    out.push(...src as Route<any>[])
  }
  return out
}

// Group routes under a base path, optionally applying a shared guard/layout
/**
 * Group routes under a base path and optionally apply a shared guard or layout.
 *
 * Examples:
 * - Shared guard
 *   ```ts
 *   const adminRoutes = group('/admin', { guard: isAdminGuard }, [
 *     { path: '/', component: AdminHome },
 *     { path: '/users', component: AdminUsers },
 *   ])
 *   ```
 *
 * - Shared layout (wraps each child route)
 *   ```ts
 *   const AdminLayout = (child: HTMLElement) => {
 *     const shell = document.createElement('div')
 *     shell.className = 'admin-shell'
 *     shell.append(
 *       <nav class="admin-nav">
 *         <a href="/admin">Home</a>
 *         <a href="/admin/users">Users</a>
 *       </nav>,
 *       child,
 *     )
 *     return shell
 *   }
 *
 *   const adminRoutes = group('/admin', { layout: AdminLayout }, [
 *     { path: '/', component: AdminHome },
 *     { path: '/users', component: AdminUsers },
 *   ])
 *   ```
 */
export function group(
  base: string,
  options: {
    guard?: RouteGuard
    layout?: (
      child: HTMLElement,
      params?: Record<string, string>,
      query?: QueryParams
    ) => HTMLElement
  } | undefined,
  routes: ReadonlyArray<Route<string>>
): Route<string>[] {
  return routes.map((r) => ({
    ...r,
    path: joinPaths(base, r.path),
    guard: options?.guard ?? r.guard,
    layout: options?.layout ?? r.layout,
  }))
}

// Build a path string from a pattern and params/query
/**
 * Build a path string from a pattern and params/query.
 *
 * Examples:
 * - Replace params
 *   `pathFor('/users/:id', { id: user.id }) // "/users/42"`
 *
 * - Add query params
 *   `pathFor('/search', {}, { q: 'laptop', page: 2 }) // "/search?q=laptop&page=2"`
 *
 * - Combine params and query (JSX)
 *   `<Link to={pathFor('/users/:id', { id }, { tab: 'posts' })} text={username} />`
 */
export function pathFor<P extends string>(
  pattern: P,
  params: PathParams<P>,
  query?: Record<string, string | number>
): string {
  let path = pattern as string
  for (const [k, v] of Object.entries(params)) {
    path = path.replace(`:${k}`, encodeURIComponent(String(v)))
  }
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)])
    ).toString()
    return `${path}?${qs}`
  }
  return path
}