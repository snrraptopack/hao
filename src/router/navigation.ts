// navigation.ts
/// <reference path="./navigation-api.d.ts" />
//
// URL state management for the Auwla router.
//
// The current path is stored in a reactive cell so that any component that
// reads it via getCurrentPath() during a render pass is automatically
// subscribed. When the URL changes (Navigation API, History API, or
// programmatic navigate()) the cell is updated and every subscribed
// component is invalidated — no manual commit(), no registerRouter(), no
// stored component handles.

import { reactive } from 'auwla'
import type { NavigateOptions, ValidRoutePath, PathParams } from "./types"
import { pathFor } from "./routes"

// ---------------------------------------------------------------------------
// Reactive path cell
//
// Initialised to the current browser URL when this module first loads in a
// browser context. In non-browser environments (SSR, tests) it starts as '/'
// and can be overridden before mounting.
// ---------------------------------------------------------------------------

const _path = reactive<string>(
  typeof window !== "undefined"
    ? window.location.pathname + window.location.search
    : "/"
)

// True when the most recent navigation was a back/forward (traverse).
// Used by the Router to decide whether to scroll to the top of the page.
let _isPopNavigation = false

// Guard so that repeated calls to initNavigation() — e.g. from Router
// re-renders or HMR — never register duplicate event listeners.
let _initialized = false

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

/**
 * Return the current browser path + search string.
 *
 * Calling this during a component render automatically subscribes that
 * component to path changes — no handle capture or commit() call needed.
 */
export function getCurrentPath(): string {
  return _path.get()
}

/** True when the last navigation was triggered by back() or forward(). */
export function isPopNavigation(): boolean {
  return _isPopNavigation
}

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

export function supportsNavigationAPI(): boolean {
  return typeof window !== "undefined" && "navigation" in window
}

// ---------------------------------------------------------------------------
// Internal: update path and notify all subscribers
// ---------------------------------------------------------------------------

function setPath(next: string): void {
  // reactive.set() does an Object.is() check internally — calling it with the
  // same value is a no-op, so duplicate events (HMR, double-fire) are safe.
  _path.set(next)
}

/**
 * Seed the reactive path cell for SSR or tests.
 * @internal
 */
export function setCurrentPath(next: string): void {
  setPath(next)
}

// ---------------------------------------------------------------------------
// Unified navigation functions
// ---------------------------------------------------------------------------

/**
 * Navigate to a path.
 *
 * Structured form (recommended):
 *
 *   navigate('/posts/:id', { params: { id: '3' }, query: { tab: 'comments' } })
 *   navigate('/login', { replace: true })
 *
 * Legacy positional form (still supported):
 *
 *   navigate('/posts/:id', { id: '3' })
 *   navigate('/posts/:id', { id: '3' }, { replace: true })
 *
 * When the `Register` interface has been augmented (via `declare module
 * 'auwla/router'`), TypeScript validates the path literal at compile time and
 * requires the correct `params` object for any dynamic segments. Without
 * augmentation, any string is accepted (backward-compatible).
 *
 * Params are interpolated into the path via pathFor() before the browser
 * navigation is triggered — the raw pattern string (e.g. '/posts/:id') is
 * never pushed into history.
 */
export function navigate<P extends ValidRoutePath>(path: P, options?: NavigateOptions<P>): void
export function navigate<P extends ValidRoutePath>(
  path: P,
  ...args: string extends P
    ? [paramsOrOptions?: Record<string, string> | NavigateOptions, options?: NavigateOptions]
    : PathParams<P> extends Record<string, never>
      ? [options?: NavigateOptions]
      : [params: PathParams<P>, options?: NavigateOptions]
): void
export function navigate<P extends ValidRoutePath>(
  path: P,
  ...args: unknown[]
): void {
  let url: string = path
  let options: NavigateOptions | undefined

  const first = args[0]
  if (first != null && typeof first === 'object') {
    // Structured options object: { params?, query?, replace? }.
    if ('params' in (first as object) || 'query' in (first as object)) {
      const opts = first as NavigateOptions<P>
      url = pathFor(path, (opts.params ?? {}) as PathParams<P>, opts.query)
      options = opts
    } else {
      // Legacy positional: a params object has at least one key other than
      // 'replace'; a bare NavigateOptions object only has 'replace'.
      const isParams = Object.keys(first).some((k) => k !== 'replace')
      if (isParams) {
        url = pathFor(path, first as PathParams<P>)
        options = args[1] as NavigateOptions | undefined
      } else {
        options = first as NavigateOptions
      }
    }
  }

  _doNavigate(url, options)
}

/** Internal: drives the actual browser navigation without any type constraints. */
function _doNavigate(path: string, options?: NavigateOptions): void {
  if (supportsNavigationAPI()) {
    window.navigation.navigate(path, {
      history: options?.replace ? "replace" : "auto",
    })
    // The Navigation API 'navigate' event listener below will call setPath().
  } else {
    _isPopNavigation = false
    if (options?.replace) {
      history.replaceState(null, "", path)
    } else {
      history.pushState(null, "", path)
    }
    // pushState/replaceState do not fire popstate, so we update manually.
    setPath(path)
  }
}

export function back(): void {
  if (supportsNavigationAPI()) {
    window.navigation.back()
  } else {
    history.back()
  }
}

export function forward(): void {
  if (supportsNavigationAPI()) {
    window.navigation.forward()
  } else {
    history.forward()
  }
}

// ---------------------------------------------------------------------------
// Initialization — called once by the Router component on first mount
// ---------------------------------------------------------------------------

export function initNavigation(): void {
  if (_initialized) return
  _initialized = true

  // Sync the reactive cell to the real URL now that we know we are in a
  // browser context. (The module-level initialiser covers most cases, but
  // SSR or test environments may mount the app later.)
  setPath(window.location.pathname + window.location.search)

  if (supportsNavigationAPI()) {
    // Navigation API — intercepts all navigations: link clicks, programmatic
    // navigate() calls, and browser back/forward (traverse).
    window.navigation.addEventListener("navigate", (e: NavigateEvent) => {
      if (!e.canIntercept || e.hashChange || e.downloadRequest) return

      const url = new URL(e.destination.url)
      _isPopNavigation = e.navigationType === "traverse"
       // 1. Update path synchronously so reactivity schedules immediately
       setPath(url.pathname + url.search)
      e.intercept({
        scroll: "manual",
        // Yield to let the Auwla microtask render complete first,
        // so the DOM matches the new state before the browser commits
        async handler() {

          await Promise.resolve()
        },
      })
    })
  } else {
    // History API fallback — popstate fires for back() and forward() only.
    // Programmatic pushState navigations are handled inside navigate() above.
    window.addEventListener("popstate", () => {
      _isPopNavigation = true
      setPath(window.location.pathname + window.location.search)
    })
  }
}
