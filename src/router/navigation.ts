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
import type { NavigateOptions } from "./types"

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

function supportsNavigationAPI(): boolean {
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

// ---------------------------------------------------------------------------
// Unified navigation functions
// ---------------------------------------------------------------------------

export function navigate(path: string, options?: NavigateOptions): void {
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
