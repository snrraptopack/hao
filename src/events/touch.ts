import type { EventModifier } from './types';
import { BLOCKED_EVENT } from '../runtime/state';

export interface IntersectOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

const touchBoundElements = new WeakSet<Element>();

/**
 * Dispatches a custom touch event with delta calculations and status flags.
 */
function dispatchTouchEvent(
  type: string,
  element: Element,
  originalEvent: PointerEvent,
  phase: 'start' | 'move' | 'end',
  x0: number,
  y0: number,
  clientX: number,
  clientY: number
) {
  const rect = element.getBoundingClientRect();
  const dx = clientX - x0;
  const dy = clientY - y0;

  // Calculate local coordinates relative to the element (0 to 1)
  const localX = (clientX - rect.left) / (rect.width || 1);
  const localY = (clientY - rect.top) / (rect.height || 1);

  const touchDetail = {
    phase,
    originalEvent,
    x0,
    y0,
    clientX,
    clientY,
    dx,
    dy,
    x: clientX,
    y: clientY,
    localX,
    localY,
    active: phase !== 'end',
    ended: phase === 'end',
    pointerId: originalEvent.pointerId,
    pointerType: originalEvent.pointerType,
    altKey: originalEvent.altKey,
    ctrlKey: originalEvent.ctrlKey,
    metaKey: originalEvent.metaKey,
    shiftKey: originalEvent.shiftKey,
  };

  const event = new CustomEvent(type, {
    detail: touchDetail,
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);
}

/**
 * Setup a pointer gesture tracker on the element.
 * Tracks pointer events and dispatches unified 'touch' custom events, 
 * as well as phase-specific 'touchstart', 'touchmove', and 'touchend' events.
 */
export function setupTouchListener(element: Element) {
  if (touchBoundElements.has(element)) return;
  touchBoundElements.add(element);

  element.addEventListener('pointerdown', (e: Event) => {
    const event = e as PointerEvent;
    // Only track left-click for mouse pointer type
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Ignore if capture fails in non-supported environments
    }

    const startX = event.clientX;
    const startY = event.clientY;

    // Dispatch both the generic 'touch' event and the specific 'touchstart' event
    dispatchTouchEvent('touch', element, event, 'start', startX, startY, startX, startY);
    dispatchTouchEvent('touchstart', element, event, 'start', startX, startY, startX, startY);

    const onPointerMove = (e: Event) => {
      const moveEvent = e as PointerEvent;
      if (moveEvent.pointerId !== event.pointerId) return;
      
      // Dispatch generic 'touch' and specific 'touchmove' events
      dispatchTouchEvent('touch', element, moveEvent, 'move', startX, startY, moveEvent.clientX, moveEvent.clientY);
      dispatchTouchEvent('touchmove', element, moveEvent, 'move', startX, startY, moveEvent.clientX, moveEvent.clientY);
    };

    const onPointerUp = (e: Event) => {
      const upEvent = e as PointerEvent;
      if (upEvent.pointerId !== event.pointerId) return;
      
      // Dispatch generic 'touch' and specific 'touchend' events
      dispatchTouchEvent('touch', element, upEvent, 'end', startX, startY, upEvent.clientX, upEvent.clientY);
      dispatchTouchEvent('touchend', element, upEvent, 'end', startX, startY, upEvent.clientX, upEvent.clientY);
      
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      try {
        element.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    };

    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
  });
}

// Monkey-patch EventTarget to setup touch tracking when 'touch' or standard touch lifecycle events are bound
if (typeof EventTarget !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (
      (type === 'touch' ||
       type === 'touchstart' ||
       type === 'touchmove' ||
       type === 'touchend' ||
       type === 'touchcancel') &&
      this instanceof Element
    ) {
      setupTouchListener(this);
    }
    return originalAddEventListener.call(this, type, listener as any, options);
  };
}

/**
 * Linearly interpolates the current touch position relative to the element's bounding box and constraints.
 * 
 * @example
 * <div onTouch={event.touch.fit(0, 100).handler(handleTouch)} />
 */
export function touchFitModifier(arg1?: any, arg2?: any, arg3?: any): EventModifier {
  return (handler) => (event) => {
    if (!event || !event.detail) return BLOCKED_EVENT;
    const detail = event.detail;

    let minX = 0, maxX = 1, stepX = 0;
    let minY = 0, maxY = 1, stepY = 0;

    if (Array.isArray(arg1) && Array.isArray(arg2)) {
      minX = arg1[0] ?? 0;
      minY = arg1[1] ?? 0;
      maxX = arg2[0] ?? 1;
      maxY = arg2[1] ?? 1;
      if (typeof arg3 === 'number') {
        stepX = stepY = arg3;
      } else if (Array.isArray(arg3)) {
        stepX = arg3[0] ?? 0;
        stepY = arg3[1] ?? 0;
      }
    } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      minX = minY = arg1;
      maxX = maxY = arg2;
      if (typeof arg3 === 'number') stepX = stepY = arg3;
    } else if (arg1 && typeof arg1 === 'object' && 'min' in arg1) {
      minX = minY = arg1.min ?? 0;
      maxX = maxY = arg1.max ?? 1;
      if (typeof arg1.step === 'number') stepX = stepY = arg1.step;
    }

    let fitX = minX + detail.localX * (maxX - minX);
    let fitY = minY + detail.localY * (maxY - minY);

    if (stepX > 0) fitX = Math.round(fitX / stepX) * stepX;
    if (stepY > 0) fitY = Math.round(fitY / stepY) * stepY;

    detail.x = fitX;
    detail.y = fitY;

    return handler(event);
  };
}

const syncStartValues = new WeakMap<any, Record<string, number>>();

/**
 * Synchronizes pointer coordinates/deltas directly into target object properties.
 * 
 * @example
 * <div onTouch={event.touch.sync(position, 'x', 'y').handler(handleDrag)} />
 */
export function touchSyncModifier(obj: any, xProp?: string, yProp?: string): EventModifier {
  return (handler) => (event) => {
    if (!event || !event.detail) return BLOCKED_EVENT;
    const detail = event.detail;

    const xKey = xProp || 'x';
    const yKey = yProp || 'y';

    let start = syncStartValues.get(obj);
    if (!start || detail.phase === 'start') {
      start = start || {};
      start[xKey] = obj[xKey] ?? 0;
      start[yKey] = obj[yKey] ?? 0;
      syncStartValues.set(obj, start);
    }

    obj[xKey] = (start[xKey] ?? 0) + detail.dx;
    obj[yKey] = (start[yKey] ?? 0) + detail.dy;

    if (detail.phase === 'end') {
      delete start[xKey];
      delete start[yKey];
      if (Object.keys(start).length === 0) {
        syncStartValues.delete(obj);
      }
    }

    return handler(event);
  };
}

const touchMovedStates = new WeakMap<Element, Record<string, boolean>>();

/**
 * Prevents execution until movement threshold (in pixels) has been met.
 * 
 * @example
 * <div onTouch={event.touch.moved(10, 'right').handler(handleSwipeRight)} />
 */
export function touchMovedModifier(threshold: number | string, direction?: string): EventModifier {
  const limit = typeof threshold === 'string' ? parseFloat(threshold) : threshold;
  const stateKey = `${direction || 'all'}-${limit}`;

  return (handler) => (event) => {
    if (!event || !event.detail || !(event.currentTarget instanceof Element)) return BLOCKED_EVENT;
    const detail = event.detail;
    const element = event.currentTarget;

    let state = touchMovedStates.get(element);
    if (!state || detail.phase === 'start') {
      state = state || {};
      state[stateKey] = false;
      touchMovedStates.set(element, state);
    }

    if (detail.phase === 'start') {
      return BLOCKED_EVENT;
    }

    const triggered = state[stateKey] ?? false;
    if (triggered) {
      return handler(event);
    }

    const dx = detail.dx;
    const dy = detail.dy;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const distance = Math.sqrt(dx * dx + dy * dy);

    let match = false;
    if (!direction) {
      match = distance >= limit;
    } else if (direction === 'x') {
      match = absX >= limit;
    } else if (direction === 'y') {
      match = absY >= limit;
    } else if (direction === 'up') {
      match = dy <= -limit;
    } else if (direction === 'down') {
      match = dy >= limit;
    } else if (direction === 'left') {
      match = dx <= -limit;
    } else if (direction === 'right') {
      match = dx >= limit;
    }

    if (match) {
      state[stateKey] = true;
      return handler(event);
    }

    if (detail.phase === 'end') {
      delete state[stateKey];
      if (Object.keys(state).length === 0) {
        touchMovedStates.delete(element);
      }
    }

    return BLOCKED_EVENT;
  };
}

import { EventChainProto, appendModifier, createEventChain } from './chain';

export const touch = createEventChain([], 'touch');
export const touchStart = createEventChain([], 'touchstart');
export const touchMove = createEventChain([], 'touchmove');
export const touchEnd = createEventChain([], 'touchend');
export const touchCancel = createEventChain([], 'touchcancel');

// Extend prototype for chaining
Object.defineProperty(EventChainProto, 'touch', {
  get(this: any) {
    return createEventChain(this._modifiers, 'touch', this._isGlobal, this._handlers);
  },
  configurable: true
});

Object.defineProperty(EventChainProto, 'touchStart', {
  get(this: any) {
    return createEventChain(this._modifiers, 'touchstart', this._isGlobal, this._handlers);
  },
  configurable: true
});

Object.defineProperty(EventChainProto, 'touchMove', {
  get(this: any) {
    return createEventChain(this._modifiers, 'touchmove', this._isGlobal, this._handlers);
  },
  configurable: true
});

Object.defineProperty(EventChainProto, 'touchEnd', {
  get(this: any) {
    return createEventChain(this._modifiers, 'touchend', this._isGlobal, this._handlers);
  },
  configurable: true
});

Object.defineProperty(EventChainProto, 'touchCancel', {
  get(this: any) {
    return createEventChain(this._modifiers, 'touchcancel', this._isGlobal, this._handlers);
  },
  configurable: true
});

Object.defineProperty(EventChainProto, 'fit', {
  value: function(this: any, arg1?: any, arg2?: any, arg3?: any) {
    return createEventChain(appendModifier(this._modifiers, touchFitModifier(arg1, arg2, arg3)), this._eventName, this._isGlobal, this._handlers);
  },
  writable: true,
  configurable: true
});

Object.defineProperty(EventChainProto, 'sync', {
  value: function(this: any, obj: any, xProp?: string, yProp?: string) {
    return createEventChain(appendModifier(this._modifiers, touchSyncModifier(obj, xProp, yProp)), this._eventName, this._isGlobal, this._handlers);
  },
  writable: true,
  configurable: true
});

Object.defineProperty(EventChainProto, 'moved', {
  value: function(this: any, threshold: number | string, direction?: string) {
    return createEventChain(appendModifier(this._modifiers, touchMovedModifier(threshold, direction)), this._eventName, this._isGlobal, this._handlers);
  },
  writable: true,
  configurable: true
});
