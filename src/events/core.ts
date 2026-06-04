/**
 * @fileoverview Core generic event modifiers for the Auwla event builder.
 * 
 * Includes standard DOM event interventions (prevent, stop, self) and 
 * polymorphic modifiers (left, right) that dynamically target either mouse buttons
 * or keyboard arrows depending on the type of event dispatched.
 */

import type { EventCondition, EventModifier, EventTargetFilter, RuntimeEventHandler } from './types';
import { isEvent, isMouseEvent, isKeyboardEvent, eventOrigin } from './shared';

/**
 * Calls event.preventDefault() before running the handler.
 */
export function preventModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.preventDefault?.();
    return handler(event);
  };
}

/**
 * Calls event.stopPropagation() to prevent bubbling before running the handler.
 */
export function stopModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.stopPropagation?.();
    return handler(event);
  };
}

/**
 * Calls event.stopImmediatePropagation() before running the handler.
 */
export function stopImmediateModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.stopImmediatePropagation?.();
    return handler(event);
  };
}

/**
 * Restricts the handler to execute at most once.
 */
export function onceModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  let called = false;
  return (event) => {
    if (called) return;
    called = true;
    return handler(event);
  };
}

/**
 * Restricts the event handler to only fire when the event target is the host element itself.
 */
export function selfModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event) && eventOrigin(event) !== event.currentTarget) return;
    return handler(event);
  };
}

/**
 * Restricts the event handler to only run for user-trusted events (not script-triggered).
 */
export function trustedModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isEvent(event) || !event.isTrusted) return;
    return handler(event);
  };
}

/**
 * Restricts the event handler using a selector or a custom filter function.
 */
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

/**
 * Logs the event to console before executing the handler.
 */
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
 * Evaluates a condition snapshot or dynamic callback before running the handler.
 */
export function ifModifier(condition: EventCondition<any>): EventModifier {
  return (handler) => (event) => {
    const allowed = typeof condition === 'function' ? condition(event) : condition;
    if (!allowed) return;
    return handler(event);
  };
}

import { mouseLeftModifier, mouseRightModifier } from './mouse';
import { keyboardLeftModifier, keyboardRightModifier } from './keyboard';

/**
 * Polymorphic left modifier: delegates to left-click check for MouseEvent
 * and ArrowLeft/Left key check for KeyboardEvent.
 */
export function leftModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  const mouseWrapped = mouseLeftModifier(handler);
  const keyWrapped = keyboardLeftModifier(handler);
  return (event) => {
    if (isMouseEvent(event)) {
      return mouseWrapped(event);
    } else if (isKeyboardEvent(event)) {
      return keyWrapped(event);
    }
  };
}

/**
 * Polymorphic right modifier: delegates to right-click check for MouseEvent
 * and ArrowRight/Right key check for KeyboardEvent.
 */
export function rightModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  const mouseWrapped = mouseRightModifier(handler);
  const keyWrapped = keyboardRightModifier(handler);
  return (event) => {
    if (isMouseEvent(event)) {
      return mouseWrapped(event);
    } else if (isKeyboardEvent(event)) {
      return keyWrapped(event);
    }
  };
}
