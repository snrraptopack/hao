/**
 * @fileoverview Component lifecycle: setup-once closures, instance caching,
 * and cleanup registry.
 *
 * Auwla components are functions that return a render closure. The outer
 * function (setup) runs once; the inner closure reruns on every invalidation.
 * This module manages those instances and their stable IDs.
 */

import { runtimeState } from './state';
import type {
  ComponentHandle,
  ComponentInstance,
  ComponentType,
  MemoChild,
  MemoProps,
  RenderClosure,
  RenderState,
} from './types';
import { isRenderClosure } from './types';
import { objectShallowEqual } from './template';

/**
 * Captures a handle to the current component during setup.
 * The returned handle can be passed to `commit()` to trigger a
 * scoped re-render of only this component and its ancestors.
 *
 * Must be called during component setup (the outer function body),
 * not inside the render callback.
 */
export function component(): ComponentHandle {
  // Nested component — has render context and a known component ID
  if (runtimeState.activeRenderState && runtimeState.activeSetupComponentId) {
    return { _id: runtimeState.activeSetupComponentId, _invalidate: runtimeState.activeRenderState.invalidate };
  }

  // Top-level component (e.g. createMemoApp(root, App) called without JSX context) —
  // no render context is active yet, so we cannot derive a real component ID.
  // '__root' is a reserved, non-empty sentinel that lets markDirty() walk up the
  // ancestor chain without collapsing dirtyComponents to null (which would force a
  // full-app re-render for every scoped commit on this handle).
  return {
    _id: '__root',
    _invalidate(ownerId?: string | null) {
      for (const app of runtimeState.mountedApps) {
        app.invalidate(ownerId);
      }
    },
  };
}

/**
 * Dispatch a bubbling component event with a plain payload.
 *
 * Parent elements can listen with `emit:eventName={payload => ...}`. The listener
 * receives `payload` directly instead of a browser `CustomEvent`.
 */
export function emit(handle: ComponentHandle, name: string, payload?: unknown): boolean {
  const node = runtimeState.componentHosts.get(handle._id);
  if (!node) return false;

  return node.dispatchEvent(new CustomEvent(name, {
    detail: payload,
    bubbles: true,
    composed: true,
  }));
}

/**
 * Registers a callback that runs when the component is removed from the tree,
 * replaced by a different component type, or the app is destroyed.
 *
 * Multiple calls are allowed — each resource can register its own cleanup.
 * Cleanups run children-before-parents to respect dependency ordering.
 *
 * Must be called during component setup (the outer function body).
 */
export function cleanup(fn: () => void): void {
  if (!runtimeState.pendingCleanups) {
    throw new Error('cleanup() must be called during component setup');
  }
  runtimeState.pendingCleanups.push(fn);
}

/**
 * Runs cleanup callbacks for a list of component entries.
 * Sorts deepest-first so children clean up before parents.
 * @internal
 */
export function runInstanceCleanups(entries: [string, ComponentInstance][]): void {
  entries.sort((a, b) => {
    let depthA = 0;
    let depthB = 0;
    for (const c of a[0]) if (c === '/') depthA++;
    for (const c of b[0]) if (c === '/') depthB++;
    return depthB - depthA;
  });
  for (const [, inst] of entries) {
    if (inst.cleanups) {
      for (const fn of inst.cleanups) fn();
    }
  }
}

/**
 * Return a stable label for a component type.
 *
 * Slashes are replaced with `|` so the label never looks like an
 * extra path segment inside a component ID string. This matters
 * because `runInstanceCleanups` measures depth by counting `/`
 * characters in the ID — a raw slash inside a minified or oddly
 * named function would cause that count to be wrong, potentially
 * firing parent cleanups before child ones.
 * @internal
 */
function componentLabel(type: ComponentType): string {
  const name = type.name || 'Anonymous';
  // Guard: strip any `/` that could corrupt the ID path structure.
  return name.includes('/') ? name.replace(/\//g, '|') : name;
}

/**
 * Derive a stable, unique ID for a component call site.
 *
 * The ID takes the form `"<parentId>/<ComponentName>:<slot>"` where
 * `slot` is either the explicit `key` prop or an auto-incremented
 * counter that is **scoped to this (parent, name) pair**.
 *
 * ### Why the counter is keyed by (parent, name)
 *
 * The old implementation used `counters[depth]`, a flat array indexed
 * by call-stack depth.  When a conditional skipped a component at a
 * given depth, every sibling that came after it shifted its slot by
 * one.  On the next render the runtime generated a different ID for
 * those siblings and treated them as new components — re-running setup,
 * firing old cleanups and losing captured state silently.
 *
 * By keying the counter as `"<parentId>/<ComponentName>"`, each
 * distinct (parent, type) pair maintains an independent sequence. Only
 * calls to the *same component type inside the same parent* share a
 * counter, so skipping one type never shifts another.
 * @internal
 */
export function createComponentId(type: ComponentType, props: MemoProps): string | null {
  if (!runtimeState.activeRenderState) return null;

  const parent = runtimeState.activeRenderState.stack[
    runtimeState.activeRenderState.stack.length - 1
  ] ?? 'root';

  const label = componentLabel(type);

  // Counter key is unique per (parent, component-name) pair.
  const counterKey = `${parent}/${label}`;
  const slot = runtimeState.activeRenderState.counters.get(counterKey) ?? 0;
  runtimeState.activeRenderState.counters.set(counterKey, slot + 1);

  // Explicit `key` prop always wins over the auto slot.
  const key = props && 'key' in props ? props.key : slot;
  return `${parent}/${label}:${String(key)}`;
}

/**
 * Push `id` onto the render stack, invoke `render`, then pop.
 *
 * The stack tells `createComponentId` who the current parent is so it
 * can build the `"<parentId>/<name>:<slot>"` path. Child counters are
 * automatically isolated via the Map key — no manual reset is needed
 * here. The Map itself is reset at the **start of each full render
 * cycle** inside `app.ts` so stale counter entries never accumulate.
 * @internal
 */
export function runInComponent<T>(id: string, render: () => T): T {
  if (!runtimeState.activeRenderState) return render();

  runtimeState.activeRenderState.stack.push(id);
  try {
    return render();
  } finally {
    runtimeState.activeRenderState.stack.pop();
  }
}

/** @internal */
export function updateProps(target: Record<string, unknown>, next: Record<string, unknown>) {
  for (const key of Object.keys(target)) {
    if (!(key in next)) delete target[key];
  }

  for (const [key, value] of Object.entries(next)) {
    target[key] = value;
  }
}

/**
 * Create a render closure for a component type.
 *
 * Setup runs once and captures closure state. Subsequent renders reuse
 * the same instance unless the component type changes at this position.
 * @internal
 */
export function createComponentClosure(
  type: ComponentType,
  props: MemoProps,
  children: MemoChild[],
): RenderClosure {
  const nextProps = { ...(props ?? {}), children };
  const id = createComponentId(type, props);

  if (!id || !runtimeState.activeRenderState) {
    const prevCleanups = runtimeState.pendingCleanups;
    runtimeState.pendingCleanups = [];
    const output = type(nextProps);
    const cleanups = runtimeState.pendingCleanups.length > 0 ? runtimeState.pendingCleanups : undefined;
    runtimeState.pendingCleanups = prevCleanups;
    // Top-level cleanups stored via __pendingCleanups for createMemoApp to collect
    if (cleanups) (output as any).__pendingCleanups = cleanups;
    return isRenderClosure(output) ? output : () => output;
  }

  return () => {
    const state = runtimeState.activeRenderState;
    if (!state) {
      const output = type(nextProps);
      return isRenderClosure(output) ? output() : output;
    }

    let instance = state.instances.get(id);
    if (!instance || instance.type !== type) {
      // Run old instance's cleanups before replacing (type change)
      if (instance?.cleanups) {
        for (const fn of instance.cleanups) fn();
      }
      const stableProps = { ...nextProps };
      const prevSetupId = runtimeState.activeSetupComponentId;
      const prevCleanups = runtimeState.pendingCleanups;
      runtimeState.activeSetupComponentId = id;
      runtimeState.pendingCleanups = [];
      const output = type(stableProps);
      runtimeState.activeSetupComponentId = prevSetupId;
      const cleanups = runtimeState.pendingCleanups.length > 0 ? runtimeState.pendingCleanups : undefined;
      runtimeState.pendingCleanups = prevCleanups;
      instance = {
        type,
        key: props && 'key' in props ? props.key : undefined,
        props: stableProps,
        render: isRenderClosure(output) ? output : () => output,
        cleanups,
      };
      state.instances.set(id, instance);
    } else {
      const propsChanged = !objectShallowEqual(instance.props, nextProps);
      updateProps(instance.props, nextProps);
      if (propsChanged) state.dirty?.add(id);
    }

    state.seen.add(id);
    if (state.dirty && !state.dirty.has(id) && 'value' in instance) {
      return instance.value;
    }

    state.rendered.add(id);
    const value = runInComponent(id, instance.render);
    instance.value = value;
    return value;
  };
}
