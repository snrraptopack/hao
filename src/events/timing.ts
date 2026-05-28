import type { RuntimeEventHandler } from './types';

export const DEFAULT_EVENT_DELAY_MS = 500;

function normalizeDelay(milliseconds?: number): number {
  return typeof milliseconds === 'number' && Number.isFinite(milliseconds) && milliseconds >= 0
    ? milliseconds
    : DEFAULT_EVENT_DELAY_MS;
}

export function debounceModifier(milliseconds?: number) {
  const delay = normalizeDelay(milliseconds);

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: Promise<void> | null = null;
    let resolvePending: (() => void) | null = null;
    let latestResult: unknown;

    return (event) => {
      latestResult = handler(event);
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
      return pending;
    };
  };
}

export function throttleModifier(milliseconds?: number) {
  const delay = normalizeDelay(milliseconds);

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    let lastRun = Number.NEGATIVE_INFINITY;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let latestEvent: unknown;

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
        handler(event);
        return;
      }

      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        lastRun = Date.now();
        handler(latestEvent);
      }, remaining);
    };
  };
}

export function cooldownModifier(milliseconds?: number) {
  const delay = normalizeDelay(milliseconds);

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    let coolingDown = false;

    return (event) => {
      if (coolingDown) return;
      coolingDown = true;
      handler(event);
      setTimeout(() => {
        coolingDown = false;
      }, delay);
    };
  };
}
