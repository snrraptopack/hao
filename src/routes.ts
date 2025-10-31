import type { Route, RouteGuard, QueryParams, PathParams } from './router'

// Type-level helpers to preserve literal path types when grouping and composing
type TrimLeftSlash<S extends string> = S extends `/${infer R}` ? TrimLeftSlash<R> : S
type TrimRightSlash<S extends string> = S extends `${infer R}/` ? TrimRightSlash<R> : S
type NormalizeBase<S extends string> = TrimRightSlash<S> extends '' | '/' ? '' : TrimRightSlash<S>
type NormalizeChild<S extends string> = TrimLeftSlash<S>
type JoinPathsLiteral<B extends string, C extends string> = NormalizeBase<B> extends ''
  ? `/${NormalizeChild<C>}`
  : `/${NormalizeBase<B>}/${NormalizeChild<C>}`

// Flatten variadic arrays while preserving element literal types
type FlattenRoutes<T extends ReadonlyArray<ReadonlyArray<Route<any>>>> = ReadonlyArray<T[number][number]>

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
export function composeRoutes<T extends ReadonlyArray<ReadonlyArray<Route<any>>>>(
  ...sources: [...T]
): FlattenRoutes<T> {
  const out: Route<any>[] = []
  for (const src of sources) {
    out.push(...(src as Route<any>[]))
  }
  return out as unknown as FlattenRoutes<T>
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
export function group<B extends string, R extends ReadonlyArray<Route<string>>>(
  base: B,
  options: {
    guard?: RouteGuard
    layout?: (
      child: HTMLElement,
      params?: Record<string, string>,
      query?: QueryParams
    ) => HTMLElement
  } | undefined,
  routes: R
): { [K in keyof R]: R[K] extends { path: infer P extends string }
      ? Omit<R[K], 'path'> & { path: JoinPathsLiteral<B, P> }
      : R[K] } {
  const mapped = routes.map((r) => ({
    ...r,
    path: joinPaths(base, r.path),
    guard: options?.guard ?? r.guard,
    layout: options?.layout ?? r.layout,
  }))
  return mapped as unknown as { [K in keyof R]: R[K] extends { path: infer P extends string }
    ? Omit<R[K], 'path'> & { path: JoinPathsLiteral<B, P> }
    : R[K] }
}

// Derive a union of route names from a routes array
export type RouteNames<R extends ReadonlyArray<Route<any>>> = Extract<R[number], { name: string }>['name']

// Get path pattern type for a given route name in a routes array
export type PathForRouteName<R extends ReadonlyArray<Route<any>>, N extends RouteNames<R>> = Extract<R[number], { name: N }> extends { path: infer P } ? P : never

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