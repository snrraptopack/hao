/**
 * @fileoverview Lazy computed values for compiled derived state.
 *
 * The compiler emits `computed(() => expr)` for setup variables that derive
 * from other local state (e.g. `const pending = todos.filter(...)`). The
 * returned getter recomputes `expr` every time it is called, so as long as the
 * component re-renders after its dependencies change, the derived value is
 * always fresh.
 *
 * This is intentionally simple: Auwla's reactivity is event-driven — components
 * re-render when event handlers invalidate them — so a computed value only
 * needs to be a lazy getter that runs during render.
 */

export type ComputedGetter<T> = () => T;

/**
 * Create a lazy getter for a derived value.
 * @internal
 */
export function computed<T>(fn: () => T): ComputedGetter<T> {
  return fn;
}
