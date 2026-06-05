import type { RuntimeEventHandler } from './types';
import { BLOCKED_EVENT } from '../runtime/index';

export const DEFAULT_EVENT_DELAY_MS = 500;

function normalizeDelay(milliseconds?: number): number {
  return typeof milliseconds === 'number' && Number.isFinite(milliseconds) && milliseconds >= 0
    ? milliseconds
    : DEFAULT_EVENT_DELAY_MS;
}

/**
 * Delays execution of the handler until after a duration of inactivity.
 * 
 * @example
 * <input onInput={event.debounce(300).handler(search)} />
 */
export function debounceModifier(milliseconds?: number) {
  const delay = normalizeDelay(milliseconds);

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: Promise<void> | null = null;
    let resolvePending: (() => void) | null = null;
    let latestResult: unknown;

    return (event) => {
      if (timer !== null) clearTimeout(timer);
      pending ??= new Promise<void>((resolve) => {
        resolvePending = resolve;
      });
      timer = setTimeout(() => {
        timer = null;
        const resolve = resolvePending;
        pending = null;
        resolvePending = null;
        Promise.resolve(latestResult).finally(resolve);
      }, delay);
      latestResult = handler(event);
      return pending;
    };
  };
}

/**
 * Limits execution of the handler to at most once per specified duration.
 * 
 * @example
 * <div onScroll={event.throttle(100).handler(handleScroll)} />
 */
export function throttleModifier(milliseconds?: number) {
  const delay = normalizeDelay(milliseconds);

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    let lastRun = Number.NEGATIVE_INFINITY;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let latestEvent: unknown;
    let pending: Promise<void> | null = null;
    let resolvePending: (() => void) | null = null;

    return (event) => {
      const now = Date.now();
      const remaining = delay - (now - lastRun);
      latestEvent = event;

      if (remaining <= 0) {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        lastRun = now;
        const result = handler(event);
        if (resolvePending) {
          const resolve = resolvePending;
          pending = null;
          resolvePending = null;
          resolve();
        }
        return result;
      }

      if (timer !== null) return pending;

      pending = new Promise<void>((resolve) => {
        resolvePending = resolve;
      });

      timer = setTimeout(() => {
        timer = null;
        lastRun = Date.now();
        const resolve = resolvePending;
        pending = null;
        resolvePending = null;
        const result = handler(latestEvent);
        Promise.resolve(result).finally(resolve!);
      }, remaining);

      return pending;
    };
  };
}

/**
 * Temporarily disables the event handler for a specified duration after it is triggered.
 * 
 * @example
 * <button onClick={event.cooldown(1000).handler(submitOnce)}>Submit</button>
 */
export function cooldownModifier(milliseconds?: number) {
  const delay = normalizeDelay(milliseconds);

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    let coolingDown = false;

    return (event) => {
      if (coolingDown) return BLOCKED_EVENT;
      coolingDown = true;
      const result = handler(event);
      setTimeout(() => {
        coolingDown = false;
      }, delay);
      return result;
    };
  };
}
