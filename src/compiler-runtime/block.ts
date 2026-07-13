/**
 * @fileoverview Compiled block primitives.
 *
 * A compiled block is an object with a `node` and an `update()` method.
 * `__componentBlock` wraps a block factory so that setup runs once and
 * `update()` is called on every subsequent render.
 */

import type { RenderClosure } from '../runtime/types';
import { currentComponentId, markDirtySource, registerComponentHost, registerComponentSources, runtimeState } from '../runtime/state';

export function __dirtySource(source: string): void {
  markDirtySource(source);
}

export function __trackSources(sources: readonly string[]): void {
  registerComponentSources(sources);
}

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
  const previous = runtimeState.activeBlockComponentIds;
  const collector = {
    set: null as Set<string> | null,
    add(id: string) {
      if (!this.set) this.set = new Set();
      this.set.add(id);
    }
  };
  runtimeState.activeBlockComponentIds = collector;
  let block: CompiledBlock<TArgs>;
  try {
    block = factory();
  } finally {
    runtimeState.activeBlockComponentIds = previous;
  }

  const originalUpdate = block.update;
  if (originalUpdate && collector.set) {
    const ids = collector.set;
    block.update = function(this: any, ...args: TArgs) {
      const prev = runtimeState.activeBlockComponentIds;
      runtimeState.activeBlockComponentIds = ids;
      try {
        return originalUpdate.apply(this, args as any);
      } finally {
        runtimeState.activeBlockComponentIds = prev;
      }
    };
    (block as any).__auwlaComponentIds = ids;
  }

  return block;
}

/**
 * Wrap a compiled block factory as a render closure.
 *
 * The factory runs once during the first render; afterwards only
 * `block.update()` is invoked.
 *
 * ### Stale-node guard
 *
 * `block.node` is fixed at setup time. If a parent's `__setChild`
 * ever calls `patchNode` and finds it cannot reuse the existing DOM
 * node (e.g. the tag or owner changed), it creates a replacement and
 * inserts it — but the internal `block` reference still points to the
 * detached original. The next `update()` call would then silently
 * patch a node that is no longer in the document.
 *
 * To prevent this, `__componentBlock` registers the factory's
 * initial node as the current host via `registerComponentHost` and
 * exposes a `currentNode` that is updated each render cycle. Callers
 * that need the live node (e.g. the `__setChild` machinery) should
 * always read `.node` on the returned `CompiledBlock` rather than
 * caching a raw reference to what was returned by the factory.
 * @internal
 */
export function __componentBlock(factory: () => CompiledBlock<[]>): RenderClosure {
  let block: CompiledBlock<[]> | null = null;

  return () => {
    // Run setup once and keep a reference to the compiled block.
    block ??= factory();

    /**
     * Register the block's node as the host for the current component
     * and return it so the runtime can insert or patch it.
     *
     * `registerComponentHost` writes the node into
     * `runtimeState.componentHosts`, which is what `emit()` uses to
     * dispatch CustomEvents from the correct DOM anchor. Calling it
     * here (rather than once in setup) ensures the host is always the
     * node that is currently in the document, even if the initial node
     * was removed and replaced by `__setChild` / `patchNode`.
     */
    registerComponentHost(currentComponentId(), block.node);

    block.update();
    return block.node;
  };
}
