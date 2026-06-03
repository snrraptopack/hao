// hooks.ts
// Global router lifecycle hooks.
import type { RouteContext } from "./types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// `from` is null on the very first page load (no previous route).
export type NavigationHookFn = (from: RouteContext | null, to: RouteContext) => void

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const _afterEachHooks: NavigationHookFn[] = []

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Register a callback that runs after every successful navigation.
// The returned function removes the hook — useful for cleanup in SSR or tests.
//
// Example — update the document title after each navigation:
//   afterEach((_, to) => {
//     const { title } = getRouteMeta<{ title?: string }>()
//     document.title = title ?? 'My App'
//   })
export function afterEach(fn: NavigationHookFn): () => void {
  _afterEachHooks.push(fn)
  return () => {
    const idx = _afterEachHooks.indexOf(fn)
    if (idx !== -1) _afterEachHooks.splice(idx, 1)
  }
}

// Fire all registered afterEach hooks. Called by the Router after a path change.
// Errors in individual hooks are caught and logged so one bad hook cannot break
// subsequent hooks or the render cycle.
export function fireAfterEach(from: RouteContext | null, to: RouteContext): void {
  for (const fn of _afterEachHooks) {
    try {
      fn(from, to)
    } catch (err) {
      console.error("[auwla/router] afterEach hook error:", err)
    }
  }
}

// Remove all registered hooks. Useful in test teardown.
export function resetHooks(): void {
  _afterEachHooks.length = 0
}
