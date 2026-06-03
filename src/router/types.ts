// types.ts
import type { TrackHandle } from 'auwla/events'

// A function that returns the component's render closure.
export type RouteComponent = () => () => any

// User-facing route definition. `component` is optional so that parent-only
// grouping routes (used purely for path prefixing) are valid.
export type Route = {
  path: string
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
  beforeEnter?: (context: RouteContext) => boolean | string
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
