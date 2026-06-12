// types.ts
import type { TrackHandle } from 'auwla/events'
import type { SuspendConfig } from './suspend'

export type { SuspendConfig }

// ---------------------------------------------------------------------------
// Typed navigation registry
// ---------------------------------------------------------------------------

/**
 * Augment this interface to enable type-safe navigation across the whole app.
 *
 * The simplest way is to add one declaration in your routes file:
 *
 *   import { defineRoutes } from 'auwla/router'
 *
 *   export const routes = defineRoutes([...])
 *
 *   declare module 'auwla/router' {
 *     interface Register {
 *       routes: typeof routes
 *     }
 *   }
 *
 * When using auwlaRouter() from 'auwla/vite-router', this is done
 * automatically via the generated `auwla.gen.ts` file.
 *
 * Once registered, navigate(), isActive(), isExactActive(), and
 * <Link href> all validate paths at compile time.
 */
export interface Register {}

/**
 * Union of all path literals from the registered route definitions.
 *
 * Falls back to `string` when no routes have been registered so that
 * existing code that calls navigate('/any/string') keeps compiling.
 */
export type ValidRoutePath =
  Register extends { routes: Array<{ path: infer P extends string }> }
    ? P
    : string

/**
 * Infer the resolved data type of a `routed` async function.
 *
 * Use this when you need to name the data shape outside the component:
 *
 *   export const routed = async (ctx, signal) => ({
 *     post: await fetchPost(ctx.params.id, signal),
 *   })
 *
 *   type PageData = Routed<typeof routed>
 *   // = { post: Post }
 *
 * In getRouted(routed) the type is inferred automatically without
 * this utility — it is only needed when the type must be named explicitly.
 */
export type Routed<F extends (...args: any[]) => Promise<any>> =
  Awaited<ReturnType<F>>

/**
 * Structured error context set whenever the Router renders an error component.
 * Read it inside an error component via getRouteError().
 *
 * - reason    — the raw rejection value from the loader (or future error sources)
 * - source    — where the error originated; currently always 'loader', extensible later
 * - context   — the route context (path, params, query) that failed
 * - message   — human-readable message (Error.message when available)
 * - stack     — stack trace when reason is an Error
 * - isAbort   — true when the loader was aborted (e.g. navigation away)
 * - route     — the matched route that failed
 * - loader    — the rejected loader handle (with .reason, .status, etc.)
 * - retry     — call to retry the failed loader
 */
export type RouteError = {
  reason: unknown
  source: 'loader'
  context: RouteContext
  message: string
  stack?: string
  isAbort: boolean
  route: ResolvedRoute
  loader: TrackHandle | null
  retry: () => void
}

import type { JSX } from '../jsx/types'

// A function that returns the component's render closure or an element.
// Accepts optional props so route components can be rendered as first-class
// JSX elements by the runtime's createComponentClosure.
export type RouteComponent = (props?: Record<string, unknown>) => JSX.Element

// Layout wrapper applied around a route's render closure.
// Receives the child render closure. If the layout needs params or query,
// it can import getParams / getQuery from auwla/router directly.
export type LayoutComponent = (child: RouteComponent) => () => any

// ---------------------------------------------------------------------------
// Path param type inference
// ---------------------------------------------------------------------------

export type PathParams<Path extends string> =
  string extends Path
    ? Record<string, string>
    : Path extends `${infer _}:${infer Param}/${infer Rest}`
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
  // Optional async data fetcher. The Router runs it automatically when the
  // route is matched, after any guard passes. The result is exposed via
  // getRouted() / getLoaderHandle() in the component. The signal is wired
  // to an AbortController so navigating away cancels in-flight work.
  routed?(context: RouteContext, signal: AbortSignal): Promise<unknown>
  // Rendered by the Router while the loader is pending (instead of the main
  // component). Called as a plain render function — no setup scope.
  // Example: () => <Skeleton />
  pendingComponent?: () => any
  // Rendered by the Router when the loader rejects. Treated as a full
  // RouteComponent so it has access to all router APIs: getLoaderHandle()
  // carries the rejected handle (loader.rejected = true, loader.reason = error),
  // getParams(), getQuery(), getRouteMeta() all work as normal.
  // Example:
  //   function PostError() {
  //     const loader = getLoaderHandle()
  //     return () => <p>Failed: {String(loader?.reason)}</p>
  //   }
  errorComponent?: RouteComponent
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

export type RouteContext<
  P extends ValidRoutePath = ValidRoutePath,
  State = Record<string, any>
> = {
  path: string
  params: PathParams<P>
  query: Record<string, string>
  state: Partial<State>
  tag: (...tags: string[]) => void
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
