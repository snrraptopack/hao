// types.ts
export type RouteComponent = () => () => any

export type Route = {
  path: string
  component?: RouteComponent
  beforeEnter?: (context: RouteContext) => boolean | string
  children?: Route[]
}

export type RouteContext = {
  path: string
  params: Record<string, string>
  query: Record<string, string>
}

export type MatchedRoute = {
  route: Route
  params: Record<string, string>
  query: Record<string, string>
}
