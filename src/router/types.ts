// types.ts
import type { TrackHandle } from 'auwla/events'
import type { SuspendConfig } from './suspend'

export type { SuspendConfig }

// A function that returns the component's render closure.
// Accepts optional props so route components can be rendered as first-class
// JSX elements by the runtime's createComponentClosure.
export type RouteComponent = (props?: Record<string, unknown>) => () => any

// Layout wrapper applied around a route's render closure.
// Receives the child render closure. If the layout needs params or query,
// it can import getParams / getQuery from auwla/router directly.
export type LayoutComponent = (child: RouteComponent) => () => any

// ---------------------------------------------------------------------------
// Path param type inference
// ---------------------------------------------------------------------------

export type PathParams<Path extends string> =
  Path extends `${infer _}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & PathParams<Rest>
    : Path extends `${infer _}:${infer Param}`
      ? { [K in Param]: string }
      : Record<string, never>

// A function that decides whether navigation to a route is allowed.
// Returning false blocks navigation; returning a string redirects to that path.
export type RouteGuard = (context: RouteContext) => boolean | string | void

// User-facing route definition. `component` is optional so that parent-only
// grouping routes (used purely for path prefixing) are valid.
export type Route = {
  path: string
  name?: string
  component?: RouteComponent
  // Optional async data loader. The Router runs it automatically when the
  // route is matched and exposes the handle via getLoaderHandle(). The signal
  // is wired to an AbortController so navigating away cancels in-flight work.
  loader?: (context: RouteContext, signal: AbortSignal) => Promise<unknown>
  // Rendered by the Router while the loader is pending (instead of the main
  // component). Called as a plain render function — no setup scope.
  // Example: () => <Skeleton />
  pendingComponent?: () => any
  // Rendered by the Router when the loader rejects. Receives the rejection
  // reason so the component can display a meaningful error.
  // Example: (reason) => <ErrorBanner message={String(reason)} />
  errorComponent?: (reason: unknown) => any
  // Arbitrary route-level metadata. Read from any component via getRouteMeta().
  // The router never inspects these values — they are purely for application use
  // (e.g. { requiresAuth: true }, { title: 'Dashboard' }, { layout: 'admin' }).
  meta?: Record<string, unknown>
  // Alias for beforeEnter. Use whichever name reads better in your codebase.
  guard?: RouteGuard
  beforeEnter?: RouteGuard
  // Layout wrapper applied around this route's component. Usually applied
  // automatically by group() so every route in a group shares the same shell.
  layout?: LayoutComponent
  children?: Route[]
}

// Options accepted by navigate().
export type NavigateOptions = {
  // When true, the current history entry is replaced instead of a new one
  // being pushed. Use for redirects and form submissions that should not
  // add an entry to the back stack.
  replace?: boolean
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

// A typed facade over TrackHandle that narrows `.value` from `unknown` to T.
// Used as the return type of getLoaderHandle<T>() so callers get a fully
// typed value without casting at every read site.
export type TypedTrackHandle<T> = Omit<TrackHandle, 'value'> & {
  readonly value: T | undefined
}

// Options for group().
export type GroupOptions = {
  layout?: LayoutComponent
  guard?: RouteGuard
}
