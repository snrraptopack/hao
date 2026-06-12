/**
 * @fileoverview Global router suspension state and visual feedback.
 *
 * When the router is waiting for a route loader to resolve, it enters a
 * "suspending" state. This module applies a CSS class and/or data attribute
 * to `<html>` so the application can dim opacity, disable pointer events,
 * or show loading chrome for a premium navigation feel.
 *
 * The runtime adds the class to `<html>`; the user controls the visual style
 * entirely through CSS:
 *
 *   .suspended {
 *     opacity: 0.6;
 *     transition: opacity 0.2s ease;
 *   }
 *
 * Configuration is optional; sensible defaults are provided.
 */

export type SuspendConfig = {
  /**
   * CSS class added to `<html>` while the router is suspended.
   * @default 'suspended'
   */
  className?: string
  /**
   * Data attribute name added to `<html>` while suspended.
   * The attribute is set without a value: `data-suspended`.
   * @default 'data-suspended'
   */
  attr?: string
  /**
   * When true, exiting suspension wraps the DOM update in document.startViewTransition
   * to automatically cross-fade the old and new pages.
   */
  viewTransition?: boolean
}

let _className = 'suspended'
let _attr = 'data-suspended'

let _suspended = false

/** Configure global suspension defaults. Safe to call multiple times. */
export function configureSuspense(config: SuspendConfig): void {
  if (config.className !== undefined) _className = config.className
  if (config.attr !== undefined) _attr = config.attr
}

/** Whether the router is currently in a suspended state. */
export function isSuspended(): boolean {
  return _suspended
}

/** Enter suspension — applies the CSS class/attribute to `<html>` immediately. */
export function enterSuspense(): void {
  _apply(true)
}

/** Exit suspension — removes the CSS class/attribute from `<html>` immediately. */
export function exitSuspense(): void {
  _apply(false)
}

function _apply(active: boolean) {
  _suspended = active
  if (typeof document === 'undefined') return

  const html = document.documentElement
  if (active) {
    html.classList.add(_className)
    html.setAttribute(_attr, '')
  } else {
    html.classList.remove(_className)
    html.removeAttribute(_attr)
  }
}
