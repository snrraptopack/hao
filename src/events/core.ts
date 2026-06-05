/**
 * @fileoverview Core generic event modifiers for the Auwla event builder.
 * 
 * Includes standard DOM event interventions (prevent, stop, self) and 
 * polymorphic modifiers (left, right) that dynamically target either mouse buttons
 * or keyboard arrows depending on the type of event dispatched.
 */

import type { EventCondition, EventModifier, EventTargetFilter, RuntimeEventHandler } from './types';
import { isEvent, isMouseEvent, isKeyboardEvent, eventOrigin } from './shared';
import { BLOCKED_EVENT, SILENT_EVENT } from '../runtime/index';

/**
 * Calls event.preventDefault() before running the handler.
 * 
 * @example
 * <form onSubmit={event.prevent.handler(handleSubmit)}>...</form>
 */
export function preventModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.preventDefault?.();
    return handler(event);
  };
}

/**
 * Calls event.stopPropagation() to prevent bubbling before running the handler.
 * 
 * @example
 * <button onClick={event.stop.handler(handleClick)}>Click</button>
 */
export function stopModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.stopPropagation?.();
    return handler(event);
  };
}

/**
 * Calls event.stopImmediatePropagation() before running the handler.
 * 
 * @example
 * <button onClick={event.stopImmediate.handler(handleClick)}>Click</button>
 */
export function stopImmediateModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) event.stopImmediatePropagation?.();
    return handler(event);
  };
}

/**
 * Restricts the handler to execute at most once.
 * 
 * @example
 * <button onClick={event.once.handler(handleClick)}>Click</button>
 */
export function onceModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  let called = false;
  return (event) => {
    if (called) return BLOCKED_EVENT;
    called = true;
    return handler(event);
  };
}

/**
 * Restricts the event handler to only fire when the event target is the host element itself.
 * 
 * @example
 * <div onClick={event.self.handler(handleClick)}>Click</div>
 */
export function selfModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event) && eventOrigin(event) !== event.currentTarget) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Restricts the event handler to only run for user-trusted events (not script-triggered).
 * 
 * @example
 * <button onClick={event.trusted.handler(handleClick)}>Click</button>
 */
export function trustedModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isEvent(event) || !event.isTrusted) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Restricts the event handler using a selector or a custom filter function.
 * 
 * @example
 * <div onClick={event.target('.btn-active').handler(handleClick)}>...</div>
 */
export function targetModifier(filter: EventTargetFilter<any>): EventModifier {
  return (handler) => (event) => {
    if (!isEvent(event)) return BLOCKED_EVENT;

    const target = eventOrigin(event);
    const matches = typeof filter === 'string'
      ? target instanceof Element && target.matches(filter)
      : filter(target, event);
    if (!matches) return BLOCKED_EVENT;

    return handler(event);
  };
}

/**
 * Logs the event to console before executing the handler.
 * 
 * @example
 * <button onClick={event.log('click-event').handler(handleClick)}>Click</button>
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
 * 
 * @example
 * <button onClick={event.if(() => count > 0).handler(decrement)}>Decrement</button>
 */
export function ifModifier(condition: EventCondition<any>): EventModifier {
  return (handler) => (event) => {
    const allowed = typeof condition === 'function' ? condition(event) : condition;
    if (!allowed) return BLOCKED_EVENT;
    return handler(event);
  };
}

import { mouseLeftModifier, mouseRightModifier } from './mouse';
import { keyboardLeftModifier, keyboardRightModifier } from './keyboard';

/**
 * Polymorphic left modifier: delegates to left-click check for MouseEvent
 * and ArrowLeft/Left key check for KeyboardEvent.
 * 
 * @example
 * <div onKeyDown={event.left.handler(goLeft)} onClick={event.left.handler(goLeft)} />
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
 * 
 * @example
 * <div onKeyDown={event.right.handler(goRight)} onClick={event.right.handler(goRight)} />
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

/**
 * Filter that triggers the handler only if the event target (or one of its ancestors)
 * matches the specified CSS selector.
 * 
 * @example
 * <div onClick={event.closest('.item').handler(deleteItem)} />
 */
export function closestModifier(selector: string): EventModifier {
  return (handler) => (event) => {
    if (!isEvent(event)) return BLOCKED_EVENT;
    const target = eventOrigin(event);
    if (target instanceof Element && target.closest(selector)) {
      return handler(event);
    }
    return BLOCKED_EVENT;
  };
}

/**
 * Executes the handler but prevents the framework from scheduling a component re-render.
 * Ideal for high-frequency events or purely background side-effects.
 * 
 * @example
 * <div onMouseMove={event.silent.handler(trackHoverPosition)} />
 */
export function silentModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    handler(event);
    return SILENT_EVENT;
  };
}

/**
 * Shorthand modifier that prevents default action and stops event propagation.
 * 
 * @example
 * <button onClick={event.trap.handler(deleteCard)}>Delete</button>
 */
export function trapModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (isEvent(event)) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    return handler(event);
  };
}

/**
 * Marker modifier indicating that the handler should only be invoked if the event
 * originates from outside the host element.
 * (Supported natively in the DOM binding layer for document-level click outside).
 * 
 * @example
 * <div onClick={event.outside.handler(closeMenu)}>Dropdown Menu</div>
 */
export function outsideModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return handler;
}
(outsideModifier as any).__outside = true;

/**
 * Registers the listener in the capture phase.
 * 
 * @example
 * <form onFocus={event.capture.handler(handleFocus)}>...</form>
 */
export function captureModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return handler;
}
(captureModifier as any).__capture = true;

/**
 * Registers the listener as passive to improve scroll/touch performance.
 * 
 * @example
 * <div onWheel={event.passive.handler(handleScroll)}>...</div>
 */
export function passiveModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return handler;
}
(passiveModifier as any).__passive = true;
