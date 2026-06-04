/**
 * @fileoverview Keyboard-specific modifiers for the Auwla event builder.
 * 
 * Includes key filters (Enter, Escape, arrow keys, etc.) and modifier-key state
 * filters (Control, Shift, Alt, Meta).
 */

import type { EventModifier, RuntimeEventHandler } from './types';
import { isKeyboardEvent } from './shared';

/**
 * Normalizes input key names to a lowercase Set for case-insensitive matching.
 */
function normalizedKeySet(key: string | readonly string[]): Set<string> {
  return new Set((Array.isArray(key) ? key : [key]).map((value) => value.toLowerCase()));
}

/**
 * Filter keys by matching name(s) against the event.key property.
 */
export function keyModifier(key: string | readonly string[]): EventModifier {
  const allowed = normalizedKeySet(key);
  return (handler) => (event) => {
    if (!isKeyboardEvent(event) || !allowed.has(event.key.toLowerCase())) return;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Ctrl key is pressed.
 */
export function ctrlModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.ctrlKey) return;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Meta/Cmd key is pressed.
 */
export function metaModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.metaKey) return;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Shift key is pressed.
 */
export function shiftModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.shiftKey) return;
    return handler(event);
  };
}

/**
 * Filters keyboard events to only allow when the Alt/Option key is pressed.
 */
export function altModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || !event.altKey) return;
    return handler(event);
  };
}

/**
 * Filters keyboard events to allow Control or Meta key combos (cross-platform Mod key).
 */
export function modModifier(handler: RuntimeEventHandler): RuntimeEventHandler {
  return (event) => {
    if (!isKeyboardEvent(event) || (!event.ctrlKey && !event.metaKey)) return;
    return handler(event);
  };
}

/**
 * Factory for discrete key filter modifiers.
 */
function keyFilterModifier(keys: string[]): EventModifier {
  const allowed = new Set(keys.map(k => k.toLowerCase()));
  return (handler) => (event) => {
    if (!isKeyboardEvent(event) || !allowed.has(event.key.toLowerCase())) return;
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
