/**
 * @fileoverview Minimal Navigation API type declarations.
 *
 * The Navigation API (https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
 * is available in Chromium-based browsers but is not yet part of TypeScript's
 * bundled lib.dom.d.ts. These declarations cover only the subset used by
 * navigation.ts so the build does not require an external @types package.
 *
 * Once TypeScript ships official Navigation API types, this file can be removed.
 */

interface NavigationNavigateOptions {
  /** Controls whether this navigation pushes a new entry or replaces the current one. */
  history?: "auto" | "push" | "replace"
  /** Arbitrary serialisable state to attach to the history entry. */
  state?: unknown
}

interface NavigationInterceptOptions {
  /**
   * An async function called by the browser to perform the navigation work.
   * The navigation is considered committed when this function resolves.
   */
  handler?: () => Promise<void>
  /** When true, the browser will not update the page's scroll position. */
  scroll?: "after-transition" | "manual"
  /** When true, the browser will not update document focus. */
  focusReset?: "after-transition" | "manual"
}

interface NavigationDestination {
  /** The full URL of the destination. */
  readonly url: string
  /** The state object associated with the destination entry, if any. */
  readonly state: unknown
  /** The index of the destination in the session history list, or -1. */
  readonly index: number
  /** Whether this entry was created by the same document. */
  readonly sameDocument: boolean
}

/** The event fired on window.navigation for every navigation attempt. */
interface NavigateEvent extends Event {
  /** The type of navigation: "push", "replace", "reload", or "traverse". */
  readonly navigationType: "push" | "replace" | "reload" | "traverse"
  /** Destination being navigated to. */
  readonly destination: NavigationDestination
  /** True if the navigation can be intercepted by the page. */
  readonly canIntercept: boolean
  /** True if only the URL hash changed. */
  readonly hashChange: boolean
  /** Non-null if this navigation was triggered by a download link. */
  readonly downloadRequest: string | null
  /** An AbortSignal that aborts when the navigation is cancelled. */
  readonly signal: AbortSignal
  /**
   * Call this to intercept the navigation and run custom logic instead of
   * the browser's default behaviour.
   */
  intercept(options?: NavigationInterceptOptions): void
  /** Prevent the navigation entirely. */
  preventDefault(): void
}

interface NavigationEventMap {
  navigate: NavigateEvent
  navigatesuccess: Event
  navigateerror: ErrorEvent
  currententrychange: Event
}

/** The Navigation API object exposed as window.navigation. */
interface Navigation extends EventTarget {
  navigate(url: string, options?: NavigationNavigateOptions): { committed: Promise<void>; finished: Promise<void> }
  back(options?: { info?: unknown }): { committed: Promise<void>; finished: Promise<void> }
  forward(options?: { info?: unknown }): { committed: Promise<void>; finished: Promise<void> }
  reload(options?: { info?: unknown; state?: unknown }): { committed: Promise<void>; finished: Promise<void> }
  addEventListener<K extends keyof NavigationEventMap>(
    type: K,
    listener: (this: Navigation, ev: NavigationEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
  removeEventListener<K extends keyof NavigationEventMap>(
    type: K,
    listener: (this: Navigation, ev: NavigationEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions
  ): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
}

// Augment the global Window interface so window.navigation is typed correctly.
interface Window {
  readonly navigation: Navigation
}
