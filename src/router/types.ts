// types.ts

// A function that returns the component's render closure.
export type RouteComponent = () => () => any

// User-facing route definition. `component` is optional so that parent-only
// grouping routes (used purely for path prefixing) are valid.
export type Route = {
  path: string
  component?: RouteComponent
  beforeEnter?: (context: RouteContext) => boolean | string
  children?: Route[]
}

// A route that has been matched and fully resolved.
// The type system guarantees `component` is present — `matchRoute` only
// returns routes that have one, so callers never need to null-check it.
export type ResolvedRoute = Omit<Route, "component"> & {
  component: RouteComponent
}

export type RouteContext = {
  path: string
  params: Record<string, string>
  query: Record<string, string>
}

export type MatchedRoute = {
  route: ResolvedRoute
  params: Record<string, string>
  query: Record<string, string>
}
