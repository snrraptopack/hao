/**
 * @fileoverview Shared utilities and type guards for the Auwla event system.
 * 
 * Provides runtime type guards to safely identify Event types (Mouse vs. Keyboard)
 * and resolve the target origin of an event.
 */

/**
 * Checks if a value is a standard DOM Event.
 */
export function isEvent(value: unknown): value is Event {
  return !!value && typeof value === 'object';
}

/**
 * Checks if an event is a MouseEvent by testing for the existence of the `button` property.
 */
export function isMouseEvent(value: unknown): value is MouseEvent {
  return isEvent(value) && 'button' in value;
}

/**
 * Checks if an event is a KeyboardEvent by testing for the existence of the `key` property.
 */
export function isKeyboardEvent(value: unknown): value is KeyboardEvent {
  return isEvent(value) && 'key' in value;
}

/**
 * Resolves the actual origin element of an event, even if originating inside a Shadow DOM.
 */
export function eventOrigin(event: Event): EventTarget | null {
  return event.composedPath?.()[0] ?? event.target;
}
