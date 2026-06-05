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
