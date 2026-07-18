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
import { h } from "../runtime/dom"
import { reactive } from "../runtime/reactive"
import type { MemoChild } from "../runtime/types"
import { initNavigation, getCurrentPath, navigate, isPopNavigation } from "./navigation"
import { matchRoute, matchRoutes, routeLayouts } from "./routes"
import { getRouteState, tagRoute } from "./cache"
import { fireAfterEach } from "./hooks"
import { enterSuspense, exitSuspense, configureSuspense } from "./suspend"
import type { SuspendConfig } from "./suspend"
import type {
  Route,
  RouteContext,
  MatchedRoute,
  RouteComponent,
  LayoutComponent,
} from "./types"

import {
  readCurrentContext,
  writeCurrentContext,
  readPendingContext,
  writePendingContext,
  writeCurrentLoader,
  writeCurrentMeta,
  writeCurrentError,
} from "./context"

// Re-exported so the public surface (router/index.ts barrel, runtime/ssr.ts
// seeds, and 'auwla/router' consumers) is unchanged after the extraction (M4).
export {
  getParams,
  getQuery,
  getLocation,
  getLoaderHandle,
  getRouted,
  getRouteError,
  getRouteMeta,
  isActive,
  isExactActive,
  __setCurrentContext,
  __setCurrentLoader,
  __setCurrentMeta,
} from "./context"

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
  // The loader handle that was active before suspension started. Written as
  // the current loader while the old component is being shown so that any
  // getLoaderHandle() call during that render sees the correct data.
  let prevCachedLoader: TrackHandle | null = null
  // Whether the navigation that triggered suspension was a pop (back/forward).
  // Saved at suspension entry so the deferred scroll-to-top on suspension exit
  // honours the same rule as immediate navigation: don't scroll on pop.
  let suspendWasPopNav = false
  // Set by error context retry(); picked up on the next Router render to restart
  // the loader with the correct Router component ID (not the error component's).
  let shouldRetry = false
  // Guard verdict cache. Guards are evaluated once per path change; re-renders
  // of the same path (e.g. when the loader settles) reuse the cached verdict
  // instead of re-running the guard. Keyed by path so navigating away and back
  // always re-evaluates.
  let guardCache: { path: string; result: unknown } | null = null

  // ---------------------------------------------------------------------------
  // Layout composition (persistent layout instances across navigations).
  //
  // PageSlot is a stable component whose page is fed by a reactive cell:
  // navigating sets the cell, PageSlot re-renders, and only the page instance
  // (keyed by routeKey) remounts. Layout wrappers are composed ONCE per
  // (layoutFn, inner) pair and cached forever, so their instances — and their
  // setup state (scroll position, open menus) — survive navigation between
  // routes that share a layout chain.
  // ---------------------------------------------------------------------------
  const pageSlotCell = reactive<{ component: RouteComponent | null; key: string }>({ component: null, key: '' })

  function PageSlot(): MemoChild {
    return () => {
      const { component, key } = pageSlotCell.get()
      return component ? h(component, { key }) : null
    }
  }

  const layoutWrapperCache = new WeakMap<LayoutComponent, WeakMap<RouteComponent, RouteComponent>>()
  const wrapOne = (layoutFn: LayoutComponent, inner: RouteComponent): RouteComponent => {
    let byInner = layoutWrapperCache.get(layoutFn)
    if (!byInner) {
      byInner = new WeakMap()
      layoutWrapperCache.set(layoutFn, byInner)
    }
    let wrapper = byInner.get(inner)
    if (!wrapper) {
      wrapper = () => layoutFn(inner)
      byInner.set(inner, wrapper)
    }
    return wrapper
  }
  const composedLayout = (layouts: readonly LayoutComponent[]): RouteComponent => {
    let child: RouteComponent = PageSlot
    for (let i = layouts.length - 1; i >= 0; i--) child = wrapOne(layouts[i]!, child)
    return child
  }

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
      if (isSuspended) {
        exitSuspense()
        isSuspended = false
        writePendingContext(null)
        prevCachedLoader = null
        suspendWasPopNav = false
      }
      previousRender = null
      // Keep navigation bookkeeping in sync on a 404. Without updating
      // cachedPath here, returning to a previously visited path would compare
      // equal against the stale cachedPath and skip the whole path-change
      // block — no loader restart, no afterEach, stale context.
      if (cachedPath !== currentPath) {
        cachedPath = currentPath
        // A navigation cancels any pending retry from the previous route.
        shouldRetry = false
        guardCache = null
        cachedLoader?.cancel()
        cachedLoader = null
        writeCurrentContext(null)
        writeCurrentLoader(null)
        writeCurrentMeta(null)
        writeCurrentError(null)
      }
      return <div>404 — page not found</div>
    }

    const { route, params, query } = matched

    // Navigation guard — evaluated once per path change. Re-renders of the
    // same path (e.g. when the loader settles) reuse the cached verdict
    // instead of re-running the guard.
    const guard = route.beforeEnter || route.guard
    let guardPromise: Promise<any> | undefined = undefined
    if (guard) {
      if (!guardCache || guardCache.path !== currentPath) {
        const context = { path: currentPath, params, query } as RouteContext<any>
        guardCache = { path: currentPath, result: guard(context) }
      }
      const result = guardCache.result
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
    } else {
      // Routes without a guard clear the cache so a verdict cached on an
      // earlier visit to this same path is never reused for a new navigation.
      guardCache = null
    }

    const hasLoader = !!route.routed || !!guardPromise

    // Retry requested by the error component: restart the loader for the current
    // route. We do this inside the Router render so the track is keyed under the
    // Router's component ID, not the error component's.
    if (shouldRetry) {
      shouldRetry = false
      if (hasLoader && cachedLoader?.rejected) {
        cachedLoader.cancel()
        cachedLoader = startLoader(route, readCurrentContext() ?? { path: currentPath, params, query, state: getRouteState(currentPath), tag: () => {} } as RouteContext<any>, guardPromise)
      }
    }

    // Capture the previous context so afterEach receives a correct `from`.
    const previousContext = readCurrentContext()

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
        writePendingContext(nextContext)
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
          writePendingContext(null)
          prevCachedLoader = null
          suspendWasPopNav = false
          cachedLoader?.cancel()
        }
        // Scroll to top now: the new content renders immediately in this branch.
        if (!isPopNavigation()) scrollToTop()
        writeCurrentContext(nextContext)
        writeCurrentMeta(route.meta ?? null)

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
      writeCurrentContext(readPendingContext()!)
      writePendingContext(null)
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
      writeCurrentLoader(cachedLoader)

      if (previousRender) {
        // Restore the previous (resolved/pending/error) loader BEFORE rendering
        // the old UI so that getLoaderHandle() inside it returns the correct data.
        writeCurrentLoader(previousRender.loader)
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
    writeCurrentContext({ path: currentPath, params, query } as RouteContext<any>)
    setRpcRouteParams(params)
    writeCurrentMeta(route.meta ?? null)
    writeCurrentLoader(cachedLoader)
    // Clear any stale error context from a previous error render on this route.
    writeCurrentError(null)

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
      const errorContext = readCurrentContext()
      const retry = () => {
        if (!cachedLoader?.rejected) return
        shouldRetry = true
        routerHandle._invalidate(routerHandle._id)
      }

      writeCurrentError({
        reason,
        source: 'loader',
        context: errorContext!,
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        isAbort: isAbortError(reason),
        route: errorRoute,
        loader: cachedLoader,
        retry,
      })
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
    //
    // Layouts wrap the keyed PageSlot from OUTSIDE with once-composed,
    // cached wrappers: layout instances don't carry the route key, so their
    // setup state (scroll position, open menus) survives navigation between
    // routes that share a layout chain — only the page remounts.
    const RouteComp = route.component
    const loaderStatus = cachedLoader?.status ?? 'idle'
    const routeKey = `${encodeURIComponent(currentPath)}:${loaderStatus}`
    pageSlotCell.set({ component: RouteComp, key: routeKey })

    const layouts = routeLayouts(route)
    const output = layouts ? h(composedLayout(layouts), {}) : h(PageSlot, {})

    // Cache this match and the exact render function so it can be kept visible
    // during a future suspension, even if the last normal render was a pending
    // or error fallback.
    previousRender = {
      matched,
      loader: cachedLoader,
      render: () => output,
    }
    return output
  }
}
