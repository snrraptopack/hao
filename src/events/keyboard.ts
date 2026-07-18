/**
 * @fileoverview Keyboard-specific modifiers for the Auwla event builder.
 * 
 * Includes key filters (Enter, Escape, arrow keys, etc.) and modifier-key state
 * filters (Control, Shift, Alt, Meta).
 */

import type { EventModifier, RuntimeEventHandler } from './types';
import { isKeyboardEvent } from './shared';
import { BLOCKED_EVENT } from '../runtime/index';

/**
 * Normalizes input key names to a lowercase Set for case-insensitive matching.
 */
function normalizedKeySet(key: string | readonly string[]): Set<string> {
  return new Set((Array.isArray(key) ? key : [key]).map((value) => value.toLowerCase()));
}

/**
 * Filters keyboard events to only match specific key name(s).
 * 
 * @example
 * <input onKeyDown={event.key('Enter').handler(submit)} />
 */
export function keyModifier(key: string | readonly string[]): EventModifier {
  const allowed = normalizedKeySet(key);
  return (handler) => (event) => {
    if (!isKeyboardEvent(event) || !allowed.has(event.key.toLowerCase())) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Ctrl key is pressed.
 * 
 * @example
 * <input onKeyDown={event.ctrl.key('s').prevent.handler(save)} />
 */
export function ctrlModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.ctrlKey) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Meta/Cmd key is pressed.
 * 
 * @example
 * <input onKeyDown={event.meta.key('z').prevent.handler(undo)} />
 */
export function metaModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.metaKey) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Shift key is pressed.
 * 
 * @example
 * <input onKeyDown={event.shift.key('Tab').prevent.handler(focusPrevious)} />
 */
export function shiftModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.shiftKey) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Alt/Option key is pressed.
 * 
 * @example
 * <input onKeyDown={event.alt.key('p').prevent.handler(openSettings)} />
 */
export function altModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.altKey) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Filters keyboard events to allow Control or Meta key combos (cross-platform Mod key).
 * 
 * @example
 * <input onKeyDown={event.mod.key('k').prevent.handler(searchPalette)} />
 */
export function modModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || (!event.ctrlKey && !event.metaKey)) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Factory for discrete key filter modifiers.
 */
function keyFilterModifier(keys: string[]): EventModifier {
  const allowed = new Set(keys.map(k => k.toLowerCase()));
  return (handler) => (event) => {
    if (!isKeyboardEvent(event) || !allowed.has(event.key.toLowerCase())) return BLOCKED_EVENT;
    return handler(event);
  };
}

// Arrow directions
export const upModifier = keyFilterModifier(['ArrowUp', 'Up']);
export const downModifier = keyFilterModifier(['ArrowDown', 'Down']);
export const keyboardLeftModifier = keyFilterModifier(['ArrowLeft', 'Left']);
export const keyboardRightModifier = keyFilterModifier(['ArrowRight', 'Right']);

// Common keystrokes
export const enterModifier = keyFilterModifier(['Enter']);
export const escModifier = keyFilterModifier(['Escape', 'Esc']);
export const delModifier = keyFilterModifier(['Delete', 'Del']);
export const tabModifier = keyFilterModifier(['Tab']);
export const spaceModifier = keyFilterModifier([' ', 'Spacebar']);

import { EventChainProto, appendModifier, createEventChain } from './chain';

export const keyDown = createEventChain([], 'keydown');
export const keyUp = createEventChain([], 'keyup');
export const keyPress = createEventChain([], 'keypress');

// Register getters dynamically
const keyboardGetters: Record<string, any> = {
  ctrl: ctrlModifier,
  meta: metaModifier,
  shift: shiftModifier,
  alt: altModifier,
  mod: modModifier,
  up: upModifier,
  down: downModifier,
  enter: enterModifier,
  esc: escModifier,
  del: delModifier,
  tab: tabModifier,
  space: spaceModifier,
};

for (const [prop, modifier] of Object.entries(keyboardGetters)) {
  Object.defineProperty(EventChainProto, prop, {
    get(this: any) {
      return createEventChain(appendModifier(this._modifiers, modifier), this._eventName, this._isGlobal, this._handlers);
    },
    configurable: true
  });
}

// Method for key matching
Object.defineProperty(EventChainProto, 'key', {
  value: function(this: any, key: string | readonly string[]) {
    return createEventChain(appendModifier(this._modifiers, keyModifier(key)), this._eventName, this._isGlobal, this._handlers);
  },
  writable: true,
  configurable: true
});

// Type-level registration (M9): these chain members exist only once this
// module is imported, so they are augmented onto EventChain here rather than
// declared in types.ts.
declare module './types' {
  interface EventChain<TEvent = Event> {
    readonly mod: EventChain<KeyboardEvent>;
    readonly ctrl: EventChain<KeyboardEvent>;
    readonly meta: EventChain<KeyboardEvent>;
    readonly shift: EventChain<KeyboardEvent>;
    readonly alt: EventChain<KeyboardEvent>;
    readonly up: EventChain<KeyboardEvent>;
    readonly down: EventChain<KeyboardEvent>;
    readonly enter: EventChain<KeyboardEvent>;
    readonly esc: EventChain<KeyboardEvent>;
    readonly del: EventChain<KeyboardEvent>;
    readonly tab: EventChain<KeyboardEvent>;
    readonly space: EventChain<KeyboardEvent>;
    readonly key: KeyEventChain;
  }
}
