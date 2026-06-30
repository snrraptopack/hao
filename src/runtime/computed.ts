/**
 * @fileoverview Lazy computed values for compiled derived state.
 *
 * The compiler emits `computed(() => expr)` for setup variables that derive
 * from other local state (e.g. `const pending = todos.filter(...)`). The
 * returned getter caches the result and only recomputes when the component
 * is invalidated, so repeated reads between invalidations are cheap.
 */

import { runtimeState } from './state';

export type ComputedGetter<T> = (() => T) & {
  _dirty: boolean;
};

/**
 * Create a memoized getter for a derived value.
 * @internal
 */
export function computed<T>(fn: () => T): ComputedGetter<T> {
  let cached: T;
  let initialized = false;

  const getter = (() => {
    if (!initialized || getter._dirty) {
      cached = fn();
      initialized = true;
      getter._dirty = false;
    }
    return cached;
  }) as ComputedGetter<T>;

  getter._dirty = true;

  const ownerId = runtimeState.activeSetupComponentId;
  if (ownerId) {
    const set = runtimeState.computedGetters.get(ownerId) ?? new Set<ComputedGetter<any>>();
    set.add(getter as ComputedGetter<any>);
    runtimeState.computedGetters.set(ownerId, set);
  }

  return getter;
}

/**
 * Mark every computed getter for a component dirty so the next render
 * recomputes them. Called by the invalidation path.
 * @internal
 */
export function markComponentComputedDirty(ownerId: string | null | undefined): void {
  if (!ownerId) return;
  const getters = runtimeState.computedGetters.get(ownerId);
  if (!getters) return;
  for (const getter of getters) {
    getter._dirty = true;
  }
}

/**
 * Remove computed getters for a component that is being unmounted.
 * @internal
 */
export function clearComponentComputedGetters(ownerId: string): void {
  runtimeState.computedGetters.delete(ownerId);
}
