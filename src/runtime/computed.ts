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
  _deps?: string[];
};

/**
 * Create a memoized getter for a derived value.
 * @internal
 */
export function computed<T>(fn: () => T, deps?: string[]): ComputedGetter<T> {
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
  if (deps) {
    getter._deps = deps;
  }

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
  const pending = runtimeState.pendingDirtySources;
  const hasPending = pending.size > 0;

  // state.ts declares its own wider getter shape ({ _dirty?: boolean }) —
  // accept it structurally rather than importing across the two modules.
  const markAll = (getters: Set<{ _dirty?: boolean; _deps?: string[] }> | undefined): void => {
    if (!getters) return;
    for (const getter of getters) {
      const deps = (getter as any)._deps;
      if (!deps || !hasPending || deps.some((d: string) => pending.has(d))) {
        getter._dirty = true;
      }
    }
  };

  // No owner means a full invalidation (plain commit()): every component
  // re-renders, so every getter must recompute — not just one component's.
  if (!ownerId) {
    for (const getters of runtimeState.computedGetters.values()) markAll(getters);
    return;
  }
  markAll(runtimeState.computedGetters.get(ownerId));
}

/**
 * Remove computed getters for a component that is being unmounted.
 * @internal
 */
export function clearComponentComputedGetters(ownerId: string): void {
  runtimeState.computedGetters.delete(ownerId);
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/**
 * Register a reactive effect for the current component.
 * The effect runs once during setup and again every time the component is invalidated.
 * @internal
 */
export function effect(fn: () => void): void {
  const ownerId = runtimeState.activeSetupComponentId;
  if (!ownerId) return;
  const list = runtimeState.effects.get(ownerId) ?? [];
  list.push(fn);
  runtimeState.effects.set(ownerId, list);
  fn();
}

const runningEffects = new Set<string>();

/**
 * Run every effect registered for a component.
 * Called by the invalidation path.
 * @internal
 */
export function runComponentEffects(ownerId: string | null | undefined): void {
  if (!ownerId || runningEffects.has(ownerId)) return;
  runningEffects.add(ownerId);
  try {
    const effects = runtimeState.effects.get(ownerId);
    if (!effects) return;
    for (const fn of effects) {
      fn();
    }
  } finally {
    runningEffects.delete(ownerId);
  }
}

/**
 * Remove effects for a component that is being unmounted.
 * @internal
 */
export function clearComponentEffects(ownerId: string): void {
  runtimeState.effects.delete(ownerId);
}
