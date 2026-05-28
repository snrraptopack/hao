import type { EventModifier, RuntimeEventHandler } from './types';

function isEvent(value: unknown): value is Event {
  return !!value && typeof value === 'object';
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
    if (isEvent(event) && event.target !== event.currentTarget) return;
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
