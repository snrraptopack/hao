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
