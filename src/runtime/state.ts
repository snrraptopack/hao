/**
 * @fileoverview Central mutable state for the active render cycle.
 *
 * These variables are owned by the runtime and mutated only by
 * `createMemoApp` (render loop) and component setup functions.
 *
 * They are stored in a single exported object so that cross-module
 * mutations work reliably under Vite's ES-module transform.
 */

import type { EventWrapper, RenderState, MountedApp,AuwlaNode } from './types';

type ComputedGetter<T = any> = (() => T) & { _dirty?: boolean };

/** Sentinel returned by event modifiers to prevent automatic render invalidation. */
export const BLOCKED_EVENT = Symbol('auwla.blocked');
export const SILENT_EVENT = Symbol('auwla.silent');

/** @internal */
export const runtimeState = ((globalThis as any).__auwla_runtimeState ??= {
  activeEventWrapper: null as EventWrapper | null,
  activeRenderState: null as RenderState | null,
  activeSetupComponentId: null as string | null,
  activeHandlerComponentId: null as string | null,
  pendingCleanups: null as (() => void)[] | null,
  pendingDirtySources: new Set<string>(),
  mountedApps: new Set<MountedApp>(),
  componentHosts: new Map<string, Node>(),
  activeBlockComponentIds: null as Set<string> | null,
  computedGetters: new Map<string, Set<ComputedGetter<any>>>(),
}) as {
  activeEventWrapper: EventWrapper | null;
  activeRenderState: RenderState | null;
  activeSetupComponentId: string | null;
  activeHandlerComponentId: string | null;
  pendingCleanups: (() => void)[] | null;
  pendingDirtySources: Set<string>;
  mountedApps: Set<MountedApp>;
  componentHosts: Map<string, Node>;
  activeBlockComponentIds: Set<string> | null;
  computedGetters: Map<string, Set<ComputedGetter<any>>>;
};

/**
 * Wrap a compiler-generated event handler with the active runtime wrapper.
 *
 * Uses the current render-stack component ID so compiled event handlers
 * schedule scoped invalidation just like runtime JSX handlers.
 * @internal
 */
export function __wrapCompilerEvent(handler: (event: Event) => unknown): EventListener {
  const wrap = runtimeState.activeEventWrapper ?? ((eventHandler) => eventHandler);
  const ownerId = runtimeState.activeSetupComponentId ?? currentComponentId();
  return wrap(handler, ownerId);
}

/** Return the ID of the component at the top of the render stack. */
export function currentComponentId(): string | null {
  if (!runtimeState.activeRenderState) return null;
  const id = runtimeState.activeRenderState.stack[runtimeState.activeRenderState.stack.length - 1];
  return id && id !== 'root' ? id : null;
}

/** @internal */
export function registerComponentHost(ownerId: string | null | undefined, node: Node): void {
  if (!ownerId) return;
  runtimeState.componentHosts.set(ownerId, node);
   (node as AuwlaNode).__auwlaOwnerId = ownerId; // Safely typed
}

/** @internal */
export function markDirtySource(source: string): void {
  runtimeState.pendingDirtySources.add(source);
}

/** @internal */
export function registerComponentSources(sources: readonly string[]): void {
  const state = runtimeState.activeRenderState;
  const id = currentComponentId();
  if (!state || !id || sources.length === 0) return;

  const deps = state.sourceDeps.get(id) ?? new Set<string>();
  for (const source of sources) deps.add(source);
  state.sourceDeps.set(id, deps);
}
