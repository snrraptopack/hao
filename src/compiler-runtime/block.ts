/**
 * @fileoverview Compiled block primitives.
 *
 * A compiled block is an object with a `node` and an `update()` method.
 * `__componentBlock` wraps a block factory so that setup runs once and
 * `update()` is called on every subsequent render.
 */

import type { RenderClosure } from '../runtime/types';
import { currentComponentId, registerComponentHost } from '../runtime/state';

export type CompiledBlock<TArgs extends readonly unknown[] = readonly unknown[]> = {
  readonly node: Node;
  update(...args: TArgs): void;
  destroy?(): void;
};

/**
 * Create a compiled block from a factory function.
 * @internal
 */
export function __createBlock<TArgs extends readonly unknown[]>(
  factory: () => CompiledBlock<TArgs>,
): CompiledBlock<TArgs> {
  return factory();
}

/**
 * Wrap a compiled block factory as a render closure.
 *
 * The factory runs once during the first render; afterwards only
 * `block.update()` is invoked.
 * @internal
 */
export function __componentBlock(factory: () => CompiledBlock<[]>): RenderClosure {
  let block: CompiledBlock<[]> | null = null;

  return () => {
    block ??= factory();
    registerComponentHost(currentComponentId(), block.node);
    block.update();
    return block.node;
  };
}
