/**
 * @fileoverview Compiled event handler bridge.
 *
 * `__event` delegates to the runtime's active event wrapper so that
 * compiled handlers schedule the same invalidation as normal JSX handlers.
 */

import { __wrapCompilerEvent } from '../runtime/state';

/**
 * Wrap a compiler-generated event handler with the runtime's invalidation logic.
 * @internal
 */
export function __event(handler: (event: Event) => unknown): EventListener {
  return __wrapCompilerEvent(handler);
}
