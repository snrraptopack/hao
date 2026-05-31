import type { EventCondition, EventModifier, EventTargetFilter, RuntimeEventHandler } from './types';

function isEvent(value: unknown): value is Event {
  return !!value && typeof value === 'object';
}

function eventOrigin(event: Event): EventTarget | null {
  return event.composedPath?.()[0] ?? event.target;
}

export function preventModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.preventDefault?.();
    return handler(event);
  };
}

export function stopModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.stopPropagation?.();
    return handler(event);
  };
}

export function stopImmediateModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.stopImmediatePropagation?.();
    return handler(event);
  };
}

export function onceModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  let called = false;
  return (event) => {
    if (called) return;
    called = true;
    return handler(event);
  };
}

export function selfModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event) && eventOrigin(event) !== event.currentTarget) return;
    return handler(event);
  };
}

export function trustedModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isEvent(event) || !event.isTrusted) return;
    return handler(event);
  };
}

export function targetModifier(filter: EventTargetFilter<any>): EventModifier {
  return (handler) => (event) => {
    if (!isEvent(event)) return;

    const target = eventOrigin(event);
    const matches = typeof filter === 'string'
      ? target instanceof Element && target.matches(filter)
      : filter(target, event);
    if (!matches) return;

    return handler(event);
  };
}

export function logModifier(label?: string): EventModifier {
  return (handler) => (event) => {
    if (label === undefined) {
      console.log(event);
    } else {
      console.log(label, event);
    }
    return handler(event);
  };
}

/**
 * Continue to the wrapped handler only when `condition` allows the event.
 *
 * Predicate conditions are evaluated for each event and can inspect both
 * closure state and the event. Boolean conditions are fixed snapshots.
 */
export function ifModifier(condition: EventCondition<any>): EventModifier {
  return (handler) => (event) => {
    const allowed = typeof condition === 'function' ? condition(event) : condition;
    if (!allowed) return;
    return handler(event);
  };
}

function isKeyboardEvent(value: unknown): value is KeyboardEvent {
  return isEvent(value) && 'key' in value;
}

function normalizedKeySet(key: string | readonly string[]): Set<string> {
  return new Set((Array.isArray(key) ? key : [key]).map((value) => value.toLowerCase()));
}

export function keyModifier(key: string | readonly string[]): EventModifier {
  const allowed = normalizedKeySet(key);
  return (handler) => (event) => {
    if (!isKeyboardEvent(event) || !allowed.has(event.key.toLowerCase())) return;
    return handler(event);
  };
}

function isMouseEvent(value: unknown): value is MouseEvent {
  return isEvent(value) && 'button' in value;
}

function mouseButtonModifier(button: number): EventModifier {
  return (handler) => (event) => {
    if (!isMouseEvent(event) || event.button !== button) return;
    return handler(event);
  };
}

export const leftModifier = mouseButtonModifier(0);
export const middleModifier = mouseButtonModifier(1);
export const rightModifier = mouseButtonModifier(2);

export function ctrlModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.ctrlKey) return;
    return handler(event);
  };
}

export function metaModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.metaKey) return;
    return handler(event);
  };
}

export function shiftModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.shiftKey) return;
    return handler(event);
  };
}

export function altModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.altKey) return;
    return handler(event);
  };
}

export function modModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || (!event.metaKey && !event.ctrlKey)) return;
    return handler(event);
  };
}
