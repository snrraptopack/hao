// Router.tsx — native to the Auwla runtime.
//
// The Router is now a pure function of getCurrentPath(). It has no component
// handle, no commit() call, no registerRouter() — it simply reads the reactive
// path cell during each render pass. When the URL changes, the reactive cell
// invalidates only the components that read it (the Router and any parent that
// called getCurrentPath() or isActive()), and the normal render loop takes
// over from there.

import {} from "auwla/jsx-runtime"
import { trackImpl as track } from "../track/core"
import type { TrackHandle } from "../track/core"
import { setRpcRoutePath, setRpcRouteParams } from "../client/rpc"
import { component } from "../runtime/component"
import { initNavigation, getCurrentPath, navigate, isPopNavigation } from "./navigation"
import { matchRoute, matchRoutes, normalizePath } from "./routes"
import { getRouteState, tagRoute } from "./cache"
import { fireAfterEach } from "./hooks"
import { enterSuspense, exitSuspense, configureSuspense } from "./suspend"
import type { SuspendConfig } from "./suspend"
import type {
  Route,
  RouteContext,
  RouteError,
  TypedTrackHandle,
  MatchedRoute,
  RouteComponent,
  ValidRoutePath,
  PathParams
} from "./types"

// ---------------------------------------------------------------------------
// Module-level route context
//
// Set during each Router render pass and read by child components via the
// getParams / getQuery / getLoaderHandle / getRouteMeta accessors below.
// Because Auwla renders depth-first and synchronously, the innermost Router
// that writes these values wins for its subtree — exactly what nested routing
// needs. They are module-level (not reactive cells) because child components
// read them during setup, not during an active render pass.
// ---------------------------------------------------------------------------

interface RouterStoreProvider {
  getCurrentContext(): RouteContext | null
  setCurrentContext(ctx: RouteContext | null): void
  getCurrentLoader(): TrackHandle | null
  setCurrentLoader(loader: TrackHandle | null): void
  getCurrentMeta(): Record<string, unknown> | null
  setCurrentMeta(meta: Record<string, unknown> | null): void
  getCurrentError(): RouteError | null
  setCurrentError(error: RouteError | null): void
}

function getStoreProvider(): RouterStoreProvider | null {
  return (globalThis as any).__auwla_routerStoreProvider ?? null
}

let _currentContext: RouteContext | null = null
let _pendingContext: RouteContext | null = null
let _currentLoader: TrackHandle | null = null
let _currentMeta: Record<string, unknown> | null = null
/**
 * Set before every error component render, cleared after every normal render.
 * Readable via getRouteError() inside any error component so the component
 * can surface the reason, source, and route context without receiving props.
 */
let _currentError: RouteError | null = null

/** @internal Server-side rendering hooks to seed route context. */
export function __setCurrentContext(ctx: RouteContext | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentContext(ctx)
  else _currentContext = ctx
}
/** @internal Server-side rendering hooks to seed the active loader handle. */
export function __setCurrentLoader(loader: TrackHandle | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentLoader(loader)
  else _currentLoader = loader
}
/** @internal Server-side rendering hooks to seed route meta. */
export function __setCurrentMeta(meta: Record<string, unknown> | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentMeta(meta)
  else _currentMeta = meta
}

export function getParams<P extends ValidRoutePath>(_path?: P): PathParams<P> {
  const provider = getStoreProvider()
  const ctx = provider ? provider.getCurrentContext() : _currentContext
  return (ctx?.params ?? {}) as PathParams<P>
}

export function getQuery(): Record<string, string> {
  const provider = getStoreProvider()
  const ctx = provider ? provider.getCurrentContext() : _currentContext
  return ctx?.query ?? {}
}

export function getLocation(): string {
  return getCurrentPath()
}

export function getLoaderHandle<T = unknown>(): TypedTrackHandle<T> | null {
  const provider = getStoreProvider()
  return (provider ? provider.getCurrentLoader() : _currentLoader) as TypedTrackHandle<T> | null
}

/**
 * Typed accessor for the active `routed` data handle.
 *
 * ── Typed call (recommended) ─────────────────────────────────────────────────
 * Pass the page's `routed` function. TypeScript infers the resolved data type
 * `T` from its return type — no manual generic is needed:
 *
 *   export const routed = async (ctx, signal) => ({
 *     post: await fetchPost(ctx.params.id, signal),
 *   })
 *
 *   function PostDetail() {
 *     const data = getRouted(routed)
 *     // data.value → { post: Post }  — fully inferred
 *     return () => <h1>{data?.value?.post.title}</h1>
 *   }
 *
 * ── Untyped call ─────────────────────────────────────────────────────────────
 * Omit the argument to get a handle typed as `unknown`. Useful in shared
 * utility code that doesn't know the specific route's data shape:
 *
 *   const data = getRouted()
 *   // data.value → unknown
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The function argument, when provided, is used by TypeScript for type
 * inference only — it is never called at runtime.
 *
 * Returns null when no routed function is active on the current route.
 */
export function getRouted<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- inference only
  _fn?: (ctx: RouteContext<any>, signal: AbortSignal) => Promise<T>,
): TypedTrackHandle<T> | null {
  const provider = getStoreProvider()
  return (provider ? provider.getCurrentLoader() : _currentLoader) as TypedTrackHandle<T> | null
}

/**
 * Returns the current error context when an error component is rendering.
 * Returns null in any other context.
 *
 * Call this in the setup of an error component (route-level or global) to
 * read the structured error regardless of whether it came from a loader or
 * another source:
 *
 *   function MyError() {
 *     const err = getRouteError()
 *     return () => (
 *       <div>
 *         <h1>Something went wrong</h1>
 *         <p>{String(err?.reason)}</p>
 *       </div>
 *     )
 *   }
 */
export function getRouteError(): RouteError | null {
  const provider = getStoreProvider()
  return provider ? provider.getCurrentError() : _currentError
}

export function getRouteMeta<T extends Record<string, unknown> = Record<string, unknown>>(): T {
  const provider = getStoreProvider()
  const meta = provider ? provider.getCurrentMeta() : _currentMeta
  return (meta ?? {}) as T
}

/**
 * Returns true when the current path starts with `path` at a segment boundary.
 *
 * Accepts any ValidRoutePath. When routes are registered via the Register
 * interface, only known paths are accepted at compile time.
 */
export function isActive(path: string): boolean {
  const current = normalizePath(getCurrentPath().split('?')[0]!)
  const target  = normalizePath(path)
  return current === target || current.startsWith(target + '/')
}

/**
 * Returns true only when the current path is an exact match for `path`.
 *
 * Accepts any path string.
 */
export function isExactActive(path: string): boolean {
  return normalizePath(getCurrentPath().split('?')[0]!) === normalizePath(path)
}

// ---------------------------------------------------------------------------
// Router component
// ---------------------------------------------------------------------------

export type RouterProps = {
  // Optional local route set. When provided the Router matches against these
  // routes instead of the global registry.
  routes?: Route[]
  /**
   * When true, navigating to a route with a loader will defer rendering the
   * new route component until the loader resolves. While suspended, a global
   * CSS class is applied to `<html>` so the application can dim opacity or
   * show loading chrome.
   *
   * If an object is provided, it configures suspension behaviour:
   *   - className: CSS class added to `<html>` (default: 'suspended')
   *   - attr: data attribute name added to `<html>` (default: 'data-suspended')
   */
  suspend?: boolean | SuspendConfig
  /**
   * Global fallback error component rendered when a matched route's loader
   * rejects and the route does not define its own errorComponent.
   *
   * Behaves exactly like a per-route errorComponent: it is a full RouteComponent
   * with access to getRouteError(), getLoaderHandle(), getParams(), getQuery().
   *
   * Per-route errorComponent always takes priority over this global fallback.
   *
   * Example:
   *   function AppError() {
   *     const err = getRouteError()
   *     return () => <div>Error on {err?.context.path}: {String(err?.reason)}</div>
   *   }
   *   <Router routes={routes} errorComponent={AppError} />
   */
  errorComponent?: RouteComponent
  /**
   * Global fallback pending component rendered when a matched route has a loader
   * but does not define its own pendingComponent.
   *
   * It is called as a plain render function (the same shape as route.pendingComponent)
   * and should return renderable content (e.g. `() => <Skeleton />`).
   *
   * This is shown during initial hard-refreshes or non-suspended navigations.
   * Note that during suspended navigations, the router intentionally keeps the
   * old page visible instead of showing this component.
   */
  pendingComponent?: () => any
}

type PreviousRender = {
  matched: MatchedRoute
  loader: TrackHandle | null
  render: () => any
}

function isAbortError(reason: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    reason instanceof DOMException &&
    reason.name === "AbortError"
  )
}

function scrollToTop(): void {
  try {
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo(0, 0)
    }
  } catch {
    // Some test environments (jsdom) stub scrollTo and log warnings.
    // Silently ignore — the visual scroll is not critical in those contexts.
  }
}


export function Router(props: RouterProps = {}) {
  // Calling initNavigation() here is still needed — it registers the browser
  // event listeners the first time. It is idempotent, so re-renders are safe.
  // No component handle is captured; the reactive path cell in navigation.ts
  // handles invalidation automatically.
  initNavigation()

  // Capture a handle so we can invalidate this Router for retries.
  const routerHandle = component()

  // Per-instance state kept alive across re-renders by closure.
  let cachedPath: string | null = null
  let cachedLoader: TrackHandle | null = null
  let previousRender: PreviousRender | null = null
  let isSuspended = false
  // The loader handle that was active before suspension started. Passed as
  // _currentLoader while the old component is being shown so that any
  // getLoaderHandle() call during that render sees the correct data.
  let prevCachedLoader: TrackHandle | null = null
  // Whether the navigation that triggered suspension was a pop (back/forward).
  // Saved at suspension entry so the deferred scroll-to-top on suspension exit
  // honours the same rule as immediate navigation: don't scroll on pop.
  let suspendWasPopNav = false
  // Set by error context retry(); picked up on the next Router render to restart
  // the loader with the correct Router component ID (not the error component's).
  let shouldRetry = false

  const { routes, suspend, errorComponent: globalErrorComponent, pendingComponent: globalPendingComponent } = props
  const suspendEnabled = !!suspend
  const useViewTransition = typeof suspend === 'object' ? !!suspend.viewTransition : false

  if (suspend && typeof suspend === 'object') {
    configureSuspense(suspend)
  }

  function startLoader(routeToLoad: Route, context: RouteContext<any>, pendingGuardPromise?: Promise<any>): TrackHandle {
    return track(`__loader:${context.path}`, async (signal) => {
      const prevPath = setRpcRoutePath(context.path)
      const prevParams = setRpcRouteParams(context.params)
      try {
        if (pendingGuardPromise) {
          const result = await pendingGuardPromise
          if (result === false) {
            throw new DOMException("Access Denied", "SecurityError")
          }
          if (typeof result === "string") {
            Promise.resolve().then(() => navigate(result, { replace: true }))
            throw new DOMException("Redirecting", "AbortError")
          }
        }
        if (routeToLoad.routed) {
          return await routeToLoad.routed(context, signal)
        }
        return null
      } finally {
        setRpcRoutePath(prevPath)
        setRpcRouteParams(prevParams)
      }
    }, { viewTransition: useViewTransition }, true)
  }

  // The render closure. Re-runs whenever the reactive path cell changes (or
  // whenever a parent component re-renders and includes this component).
  return () => {
    // Reading getCurrentPath() here subscribes this render closure to the
    // reactive path cell. When the URL changes, this closure is re-run.
    const currentPath = getCurrentPath()
    const matched = routes ? matchRoutes(routes, currentPath) : matchRoute(currentPath)

    if (!matched) {
      if (isSuspended) { exitSuspense(); isSuspended = false }
      previousRender = null
      return <div>404 — page not found</div>
    }

    const { route, params, query } = matched

    // Navigation guard
    const guard = route.beforeEnter || route.guard
    let guardPromise: Promise<any> | undefined = undefined
    if (guard) {
      const context = { path: currentPath, params, query } as RouteContext<any>
      const result = guard(context)
      if (result === false) {
        previousRender = null
        return <div>403 — access denied</div>
      }
      if (typeof result === "string") {
        // Defer so the redirect does not happen mid-render.
        Promise.resolve().then(() => navigate(result, { replace: true }))
        previousRender = null
        return <div>Redirecting…</div>
      }
      if (result as any instanceof Promise) {
        guardPromise = result as unknown as Promise<any>
      }
    }

    const hasLoader = !!route.routed || !!guardPromise

    // Retry requested by the error component: restart the loader for the current
    // route. We do this inside the Router render so the track is keyed under the
    // Router's component ID, not the error component's.
    if (shouldRetry) {
      shouldRetry = false
      if (hasLoader && cachedLoader?.rejected) {
        cachedLoader.cancel()
        cachedLoader = startLoader(route, _currentContext ?? { path: currentPath, params, query, state: getRouteState(currentPath), tag: () => {} } as RouteContext<any>, guardPromise)
      }
    }

    // Capture the previous context so afterEach receives a correct `from`.
    const previousContext = _currentContext

    // Path changed — run one-time navigation side effects.
    if (cachedPath !== currentPath) {
      cachedPath = currentPath
      // A navigation cancels any pending retry from the previous route.
      shouldRetry = false

      const nextContext = {
        path: currentPath,
        params,
        query,
        state: getRouteState(currentPath),
        tag: (...tags: string[]) => tagRoute(currentPath, tags)
      } as RouteContext<any>

      if (suspendEnabled && hasLoader && !isSuspended && previousRender) {
        // Enter suspension: start the loader but keep the current route visible.
        // Do NOT scroll yet — we are still showing the previous page content.
        // The scroll happens in the suspension-exit block below when the new
        // content actually appears.
        isSuspended = true
        enterSuspense()
        _pendingContext = nextContext
        // Capture whether this was a pop navigation so the deferred scroll can
        // make the same decision without racing against a future navigation.
        suspendWasPopNav = isPopNavigation()

        prevCachedLoader = cachedLoader

        cachedLoader = startLoader(route, nextContext, guardPromise)
      } else {
        if (isSuspended) {
          // Navigating away from a suspended state — clean up.
          exitSuspense()
          isSuspended = false
          _pendingContext = null
          prevCachedLoader = null
          suspendWasPopNav = false
          cachedLoader?.cancel()
        }
        // Scroll to top now: the new content renders immediately in this branch.
        if (!isPopNavigation()) scrollToTop()
        _currentContext = nextContext
        _currentMeta = route.meta ?? null

        if (hasLoader) {
          cachedLoader = startLoader(route, nextContext, guardPromise)
        } else {
          cachedLoader = null
        }
      }

      fireAfterEach(previousContext, nextContext)
    }

    // Check if an active suspension has just resolved or rejected.
    if (isSuspended && cachedLoader && !cachedLoader.pending) {
      isSuspended = false
      exitSuspense()
      _currentContext = _pendingContext!
      _pendingContext = null
      // Cancel the loader for the previous page — we are committing the new
      // route now, so any in-flight work for the old page is no longer needed.
      prevCachedLoader?.cancel()
      prevCachedLoader = null
      // Deferred scroll: the new content is about to be painted for the first
      // time, so this is the correct moment to reset the scroll position.
      if (!suspendWasPopNav) scrollToTop()
      suspendWasPopNav = false
      // Fall through to normal render with the now-resolved loader.
    }

    // During suspension, keep showing the previous render so the user still
    // sees content (dimmed via global CSS) while data loads.
    if (isSuspended) {
      // Expose the new pending loader for any route.pendingComponent that needs it.
      _currentLoader = cachedLoader

      if (previousRender) {
        // Restore the previous (resolved/pending/error) loader BEFORE rendering
        // the old UI so that getLoaderHandle() inside it returns the correct data.
        _currentLoader = previousRender.loader
        return previousRender.render()
      }

      const pendingComp = route.pendingComponent ?? globalPendingComponent
      if (pendingComp) {
        return pendingComp()
      }

      // First-ever render and it has a loader — nothing previous to show.
      return <div>Loading… (Your route has a loader but didnt provide a pending component)</div>
    }

    // Normal render path — refresh accessors for the current match.
    _currentContext = { path: currentPath, params, query } as RouteContext<any>
    setRpcRouteParams(params)
    _currentMeta = route.meta ?? null
    _currentLoader = cachedLoader
    // Clear any stale error context from a previous error render on this route.
    _currentError = null

    // Loader fallbacks — re-evaluated on every render so they react to loader
    // state transitions (pending → resolved / rejected) automatically.
    // If suspend is enabled, this will only hit on the initial page load (hard refresh),
    // which is exactly what we want since we can't defer the first render.
    const pendingComp = route.pendingComponent ?? globalPendingComponent
    if (cachedLoader?.pending && pendingComp) {
      previousRender = {
        matched,
        loader: cachedLoader,
        render: () => pendingComp(),
      }
      return pendingComp()
    }

    // Check if the loader was rejected (e.g. security block or cancel).
    if (cachedLoader?.rejected) {
      const reason = cachedLoader.reason
      if (isAbortError(reason)) {
        previousRender = null
        return null
      }
      if (reason instanceof DOMException && reason.name === "SecurityError") {
        previousRender = null
        return <div>403 — access denied</div>
      }
    }

    // Resolve which error component to render (route-level wins over global).
    const errorComp = cachedLoader?.rejected
      ? (route.errorComponent ?? globalErrorComponent)
      : null

    if (errorComp) {
      // Build structured error context and expose it via getRouteError() so the
      // component can read it without receiving props.
      const reason = cachedLoader!.reason
      const errorRoute = route
      const errorContext = _currentContext
      const retry = () => {
        if (!cachedLoader?.rejected) return
        shouldRetry = true
        routerHandle._invalidate(routerHandle._id)
      }

      _currentError = {
        reason,
        source: 'loader',
        context: errorContext!,
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        isAbort: isAbortError(reason),
        route: errorRoute,
        loader: cachedLoader,
        retry,
      }
      const ErrorComp = errorComp
      const errorKey = `${encodeURIComponent(currentPath)}:error`
      previousRender = {
        matched,
        loader: cachedLoader,
        render: () => <ErrorComp key={errorKey} />,
      }
      return <ErrorComp key={errorKey} />
    }

    // Render the matched component through the JSX runtime so that
    // createComponentClosure manages its full lifecycle (correct IDs,
    // automatic cleanup on route changes, track scoping).
    //
    // The key includes loaderStatus so that when the loader transitions
    // (pending → resolved / rejected) the component gets a fresh instance.
    // Without this, createComponentClosure would serve the stale cached
    // instance.value (the pending-state UI) because the RouteComp ID is not
    // in the dirty set — only the Router's ID is.
    const RouteComp = route.component
    const loaderStatus = cachedLoader?.status ?? 'idle'
    const routeKey = `${encodeURIComponent(currentPath)}:${loaderStatus}`
    const output = <RouteComp key={routeKey} />

    // Cache this match and the exact render function so it can be kept visible
    // during a future suspension, even if the last normal render was a pending
    // or error fallback.
    previousRender = {
      matched,
      loader: cachedLoader,
      render: () => <RouteComp key={routeKey} />,
    }
    return output
  }
}
