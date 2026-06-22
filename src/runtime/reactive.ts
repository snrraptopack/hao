/**
 * @fileoverview Reactive cell primitive for the Auwla runtime.
 *
 * A reactive cell holds a value. Any component that reads it via `.get()`
 * during a render pass is automatically subscribed. When the value changes
 * via `.set()`, every subscribed component is invalidated through the same
 * `invalidate()` function that `commit()` uses — so the dirty-set and
 * render-loop optimisations work exactly as they do for manual commits.
 *
 * This does NOT change Auwla's core philosophy:
 *  - Components are still plain functions that return render closures.
 *  - Re-renders are still driven by the same `renderNow` loop.
 *  - The dirty-set still limits which components re-run.
 *
 * The only new thing is that a reactive cell wires subscriptions automatically
 * instead of requiring the caller to capture a handle and call `commit()`.
 *
 * Design notes:
 *  - Subscriptions are stored as `(invalidate, componentId)` pairs.
 *  - The `invalidate` function is read from `activeRenderState` at the moment
 *    `.get()` is called — it is the scoped invalidate for the mounted app.
 *  - The subscriber set is snapshotted and cleared before notifying so that
 *    new subscriptions added during re-render don't interfere with the current
 *    notification pass. Subscriptions refresh automatically on each re-render
 *    (the next call to `.get()` re-registers the component).
 *  - `Object.is` equality check: setting the same value is a no-op, preventing
 *    unnecessary re-renders.
 */

import { runtimeState } from './state';
import { currentComponentId } from './state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A reactive cell. Call `.get()` to read (and subscribe).
 * Call `.set()` to write (and invalidate all current subscribers).
 */
export type ReactiveCell<T> = {
  get(): T;
  set(value: T): void;
  notify(): void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a reactive cell with an initial value.
 *
 * @example
 * // In navigation.ts:
 * const _path = reactive(window.location.pathname)
 *
 * export function getCurrentPath(): string {
 *   return _path.get()  // subscribes the rendering component automatically
 * }
 *
 * // On navigate:
 * _path.set('/new-path')  // re-renders all components that called getCurrentPath()
 */
export function reactive<T>(initial: T): ReactiveCell<T> {
  let value = initial;
  let subscribers = new Map<string, (ownerId?: string | null) => void>();

  return {
    get(): T {
      // Only subscribe when inside an active render pass (activeRenderState is set)
      // and when there is a real component on the render stack or being set up.
      // During setup, the component being set up takes precedence over the parent
      // that is currently on the render stack, so reactive reads in setup scope
      // subscribe the correct component.
      const state = runtimeState.activeRenderState;
      const id = runtimeState.activeSetupComponentId ?? currentComponentId();
      if (state && id) {
        subscribers.set(id, state.invalidate);
      }
      return value;
    },

    set(next: T): void {
      // Skip if the value hasn't actually changed — prevents pointless re-renders.
      if (Object.is(value, next)) return;
      value = next;
      this.notify();
    },

    notify(): void {
      // Snapshot the current subscribers and clear the live set BEFORE notifying.
      // This ensures that any new subscriptions created during re-render (via .get()
      // in a component that renders because of this notification) go into the fresh
      // set and don't interact with the current notification pass.
      const snapshot = Array.from(subscribers.entries());
      subscribers = new Map();

      for (const [id, invalidate] of snapshot) {
        invalidate(id);
      }
    },
  };
}
