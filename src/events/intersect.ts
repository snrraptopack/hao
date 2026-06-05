import type { EventModifier, RuntimeEventHandler } from './types';
import { BLOCKED_EVENT } from '../runtime/state';

export interface IntersectOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

const observers = new WeakMap<Element, IntersectionObserver>();

function getObserver(options: IntersectOptions): IntersectionObserver {
  // If no specific root/margin, we could use a global observer, 
  // but since we support custom options, we create one per unique config.
  // For simplicity and correctness with custom roots, we instantiate one per element currently.
  return new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.dispatchEvent(new CustomEvent('intersect', { detail: entry }));
      }
    },
    options
  );
}

export function setupIntersectionObserver(element: Element, options: IntersectOptions = {}) {
  if (observers.has(element)) return;
  const observer = getObserver(options);
  observer.observe(element);
  observers.set(element, observer);
}

export function teardownIntersectionObserver(element: Element) {
  const observer = observers.get(element);
  if (observer) {
    observer.unobserve(element);
    observers.delete(element);
  }
}

// Monkey-patch EventTarget to automatically set up IntersectionObserver for 'intersect' events
if (typeof EventTarget !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    if (type === 'intersect' && this instanceof Element) {
      // Dispatch a synthetic setup event to extract options from the modifier
      const setupEvent = new CustomEvent('intersect', { detail: { __auwlaSetup: true, options: {} } });
      
      if (typeof listener === 'function') {
        listener.call(this, setupEvent);
      } else if (listener && typeof listener.handleEvent === 'function') {
        listener.handleEvent(setupEvent);
      }

      const observerOptions = setupEvent.detail.options;
      setupIntersectionObserver(this, observerOptions);
    }
    return originalAddEventListener.call(this, type, listener as any, options);
  };

  EventTarget.prototype.removeEventListener = function(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
    if (type === 'intersect' && this instanceof Element) {
      teardownIntersectionObserver(this);
    }
    return originalRemoveEventListener.call(this, type, listener as any, options);
  };
}

/**
 * Checks if the event is an IntersectionObserver CustomEvent.
 */
function isIntersectionEvent(event: unknown): event is CustomEvent<IntersectionObserverEntry> {
  return event instanceof CustomEvent && event.type === 'intersect' && 'intersectionRatio' in (event.detail || {});
}

/**
 * Modifier for @intersect.
 * Configures the IntersectionObserver and filters the event.
 * 
 * @example
 * // Trigger when more than 50% visible
 * <div onIntersect={event.intersect(0.5).in.handler(handler)} />
 * 
 * // Trigger when leaving the viewport
 * <div onIntersect={event.intersect.out.handler(handler)} />
 * 
 * // Trigger with custom root element and options
 * <Box onIntersect={event.intersect({ root: appRef, threshold: 0.5 }).out.handler(handler)} />
 */
export function intersectModifier(optionsOrThreshold?: IntersectOptions | number): EventModifier {
  let options: IntersectOptions = {};
  if (typeof optionsOrThreshold === 'number') {
    options = { threshold: optionsOrThreshold };
  } else if (optionsOrThreshold) {
    options = optionsOrThreshold;
  }

  return (handler: RuntimeEventHandler): RuntimeEventHandler => {
    return (event: unknown) => {
      // Intercept the setup event to pass options to the monkey-patch
      if (event instanceof CustomEvent && event.type === 'intersect' && event.detail && event.detail.__auwlaSetup) {
        event.detail.options = options;
        return BLOCKED_EVENT;
      }

      if (!isIntersectionEvent(event)) return BLOCKED_EVENT;
      
      return handler(event);
    };
  };
}

/**
 * @intersect.in modifier
 * Only triggers when the element starts intersecting (or increases ratio).
 */
export function intersectInModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event: unknown) => {
    if (event instanceof CustomEvent && event.detail && event.detail.__auwlaSetup) return handler(event);
    if (!isIntersectionEvent(event) || !event.detail.isIntersecting) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * @intersect.out modifier
 * Only triggers when the element stops intersecting (or decreases ratio).
 */
export function intersectOutModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event: unknown) => {
    if (event instanceof CustomEvent && event.detail && event.detail.__auwlaSetup) return handler(event);
    if (!isIntersectionEvent(event) || event.detail.isIntersecting) return BLOCKED_EVENT;
    return handler(event);
  };
}
