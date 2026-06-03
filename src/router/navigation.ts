// navigation.ts
import { commit } from "auwla"
import type { ComponentHandle } from "auwla"

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let routerHandle: ComponentHandle | null = null

// Null until initNavigation() runs so that importing this module in a
// non-browser context (tests, SSR) does not crash on window.location.
let _currentPath: string | null = null

// Guard so that repeated calls to initNavigation() (e.g. from Router
// re-renders or HMR) never register duplicate event listeners.
let _initialized = false

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

// Lazily resolve the current path on first access.
export function getCurrentPath(): string {
  if (_currentPath === null) {
    _currentPath = window.location.pathname + window.location.search
  }
  return _currentPath
}

export function registerRouter(handle: ComponentHandle): void {
  routerHandle = handle
}

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

// Returns true when the browser supports the Navigation API.
// Checked at call time (not at module load) to stay SSR-safe.
function supportsNavigationAPI(): boolean {
  return typeof window !== "undefined" && "navigation" in window
}

// Notify the router that the path has changed and a re-render is needed.
function notifyRouter(): void {
  if (routerHandle) commit(routerHandle)
}

// ---------------------------------------------------------------------------
// Unified navigation functions
// Each function prefers the Navigation API and silently falls back to the
// History API so callers never have to care which mode is active.
// ---------------------------------------------------------------------------

export function navigate(path: string): void {
  if (supportsNavigationAPI()) {
    window.navigation.navigate(path)
  } else {
    // pushState does not fire popstate, so we update state manually here.
    history.pushState(null, "", path)
    _currentPath = path
    notifyRouter()
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
// Initialization
// ---------------------------------------------------------------------------

export function initNavigation(): void {
  // Idempotent — safe to call from a component that may remount.
  if (_initialized) return
  _initialized = true

  // Capture the real path now that we know we're in a browser context.
  _currentPath = window.location.pathname + window.location.search

  if (supportsNavigationAPI()) {
    // Navigation API path — handles all navigation including pushState calls
    // made by the navigate() function above when this branch is taken.
    window.navigation.addEventListener("navigate", (e: NavigateEvent) => {
      if (!e.canIntercept || e.hashChange || e.downloadRequest) return
      const url = new URL(e.destination.url)
      e.intercept({
        handler() {
          _currentPath = url.pathname + url.search
          notifyRouter()
        },
      })
    })
  } else {
    // History API fallback — handles back() and forward() which trigger
    // popstate.  forward pushes are handled directly inside navigate().
    window.addEventListener("popstate", () => {
      _currentPath = window.location.pathname + window.location.search
      notifyRouter()
    })
  }
}
