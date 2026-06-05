/**
 * @fileoverview Mouse-specific event modifiers for the Auwla event builder.
 * 
 * Filters mouse event properties like left, middle, and right click buttons.
 */

import type { EventModifier } from './types';
import { isMouseEvent } from './shared';
import { BLOCKED_EVENT } from '../runtime/index';

/**
 * Helper to build modifiers that restrict handlers to a specific mouse button.
 */
function mouseButtonModifier(button: number): EventModifier {
  return (handler) => (event) => {
    if (!isMouseEvent(event) || event.button !== button) return BLOCKED_EVENT;
    return handler(event);
  };
}

/**
 * Mouse button filters (button 0 = left, button 1 = middle, button 2 = right)
 * 
 * @example
 * <div onMouseDown={event.left.handler(startDrag)} />
 * <div onMouseDown={event.middle.handler(middleClick)} />
 * <div onMouseDown={event.right.handler(contextMenu)} />
 */
export const mouseLeftModifier = mouseButtonModifier(0);
export const middleModifier = mouseButtonModifier(1);
export const mouseRightModifier = mouseButtonModifier(2);
