/**
 * @fileoverview Event-handler wrapping and auto-invalidation.
 *
 * Every DOM handler the runtime binds goes through `createEventListener`:
 * the handler runs with `activeHandlerComponentId` set, then the owning
 * component is invalidated (scheduling a re-render) unless the handler
 * returned the BLOCKED_EVENT / SILENT_EVENT sentinels. High-frequency events
 * are throttled to one invalidation per animation frame.
 */

import { runtimeState, BLOCKED_EVENT, SILENT_EVENT } from './state';

/** Events that fire rapidly and should be throttled to one render per frame. */
const HIGH_FREQUENCY_EVENTS = new Set([
  'input',
  'mousemove',
  'scroll',
  'touchmove',
  'wheel',
  'pointermove',
]);

/** Schedule a callback for the next animation frame, falling back to setTimeout in test environments. */
function scheduleFrame(callback: () => void): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
}

/**
 * App-scoped state the listener factory needs. Passed as getters because
 * `scheduled` / `destroyed` are mutable bindings in the app closure.
 */
export type EventListenerDeps = {
  invalidate: (ownerId?: string | null) => void;
  isScheduled: () => boolean;
  isDestroyed: () => boolean;
};

/**
 * Wrap a user handler so that, after it runs, the owning component is
 * invalidated. Promise-returning handlers defer invalidation until the
 * promise settles (timing modifiers rely on this).
 */
export function createEventListener<TModel>(
  deps: EventListenerDeps,
  handler: (event: Event, model: TModel) => unknown,
  model: TModel | undefined,
  ownerId: string | null,
): EventListener {
  let frameId: number | null = null;

  const throttledInvalidate = () => {
    if (frameId !== null || deps.isScheduled() || deps.isDestroyed()) return;
    frameId = scheduleFrame(() => {
      frameId = null;
      if (!deps.isDestroyed()) deps.invalidate(ownerId);
    });
  };

  return (evt) => {
    const prevHandlerId = runtimeState.activeHandlerComponentId;
    runtimeState.activeHandlerComponentId = ownerId;
    try {
      const result = handler(evt, model as TModel);
      if (result !== undefined && result === BLOCKED_EVENT) return;
      if (result !== undefined && result === SILENT_EVENT) return;
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        // Defer invalidation until the promise settles (timing modifiers
        // rely on this). The handler id is NOT restored here — the
        // synchronous finally below already did that, and a deferred
        // restore would clobber a newer handler's id (B5).
        void (result as Promise<unknown>).finally(() => {
          deps.invalidate(ownerId);
        });
        return;
      }
    } finally {
      runtimeState.activeHandlerComponentId = prevHandlerId;
    }
    if (HIGH_FREQUENCY_EVENTS.has(evt.type)) {
      throttledInvalidate();
    } else {
      deps.invalidate(ownerId);
    }
  };
}
