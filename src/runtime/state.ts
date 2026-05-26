/**
 * @fileoverview Central mutable state for the active render cycle.
 *
 * These variables are owned by the runtime and mutated only by
 * `createMemoApp` (render loop) and component setup functions.
 *
 * They are stored in a single exported object so that cross-module
 * mutations work reliably under Vite's ES-module transform.
 */

import type { EventWrapper, RenderState, MountedApp } from './types';

/** @internal */
export const runtimeState = {
  activeEventWrapper: null as EventWrapper | null,
  activeRenderState: null as RenderState | null,
  activeSetupComponentId: null as string | null,
  pendingCleanups: null as (() => void)[] | null,
  mountedApps: new Set<MountedApp>(),
};

/**
 * Wrap a compiler-generated event handler with the active runtime wrapper.
 * @internal
 */
export function __wrapCompilerEvent(handler: (event: Event) => unknown): EventListener {
  return (runtimeState.activeEventWrapper ?? ((eventHandler) => eventHandler))(handler);
}

/** Return the ID of the component at the top of the render stack. */
export function currentComponentId(): string | null {
  if (!runtimeState.activeRenderState) return null;
  const id = runtimeState.activeRenderState.stack[runtimeState.activeRenderState.stack.length - 1];
  return id && id !== 'root' ? id : null;
}
