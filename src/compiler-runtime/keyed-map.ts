/**
 * @fileoverview Keyed list runtime for compiled output.
 *
 * Reuses row blocks by key, creates blocks only for new keys, moves
 * existing DOM nodes with an LIS reorder strategy, and skips row
 * updates when dependency arrays are unchanged.
 */

import type { CompiledBlock } from './block';
import { runtimeState } from '../runtime/state';
import { removeNode } from './dom-setters';
import { NO_INDEX } from '../shared/constants';
import { sameDeps } from '../shared/deps';
import { longestIncreasingSubsequence } from '../shared/lis';

function markBlockSeen(block: CompiledBlock<any>): void {
  const state = runtimeState.activeRenderState;
  if (state) {
    const ids = (block as any).__auwlaComponentIds as Set<string> | undefined;
    if (ids) {
      for (const id of ids) {
        state.seen.add(id);
      }
    }
  }
}

/** @internal */
/** @internal */
export type AuwlaRowBlock<TItem> = CompiledBlock<[TItem, number]> & {
  __auwlaKey?: unknown;
  __auwlaItem?: TItem;
  __auwlaDeps?: unknown;
};

/** @internal */
function placeCompiledNodes(parent: Node, nodes: Node[], anchor: Node, oldChildren: Node[]) {
  const oldIndexes = new Map<Node, number>();
  for (let i = 0; i < oldChildren.length; i++) oldIndexes.set(oldChildren[i]!, i);

  const indexes = nodes.map((node) => oldIndexes.get(node) ?? NO_INDEX);
  const stableIndexes = longestIncreasingSubsequence(indexes);
  let stableCursor = stableIndexes.length - 1;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!;
    const next = nodes[i + 1] ?? anchor;
    const isStable = stableCursor >= 0 && stableIndexes[stableCursor] === i;

    if (isStable && node.parentNode === parent && node.nextSibling === next) {
      stableCursor--;
      continue;
    }

    if (node.parentNode !== parent || node.nextSibling !== next) {
      parent.insertBefore(node, next);
    }
  }
}

/** @internal */
function swapCompiledRows<TItem>(
  parent: Node,
  orderedRows: AuwlaRowBlock<TItem>[],
  leftIndex: number,
  rightIndex: number,
  anchor: Node,
) {
  const left = orderedRows[leftIndex]!;
  const right = orderedRows[rightIndex]!;
  const afterRight = orderedRows[rightIndex + 1]?.node ?? anchor;

  parent.insertBefore(right.node, left.node);
  parent.insertBefore(left.node, afterRight);

  orderedRows[leftIndex] = right;
  orderedRows[rightIndex] = left;
}

/** @internal */
function clearCompiledRows<TItem>(
  rows: Map<unknown, AuwlaRowBlock<TItem>>,
  orderedRows: AuwlaRowBlock<TItem>[],
  anchor: Node,
  hasDestroyableRows: boolean,
) {
  if (orderedRows.length === 0) return;

  if (hasDestroyableRows) {
    for (const row of orderedRows) {
      if (row.destroy) row.destroy();
    }
  }

  const first = orderedRows[0]!.node;
  if (first.parentNode && first.parentNode === anchor.parentNode) {
    const parent = first.parentNode;
    if (parent.firstChild === first && anchor.nextSibling === null) {
      parent.replaceChildren(anchor);
    } else {
      const range = document.createRange();
      range.setStartBefore(first);
      range.setEndBefore(anchor);
      range.deleteContents();
      range.detach();
    }
  } else {
    for (const row of orderedRows) removeNode(row.node);
  }

  rows.clear();
  orderedRows.length = 0;
}

/**
 * Keyed map runtime for compiled lists.
 *
 * @internal
 */
export function __keyedMap<TItem, TKey>(
  items: readonly TItem[],
  keyOf: (item: TItem, index: number) => TKey,
  createRow: (item: TItem, index: number) => CompiledBlock<[TItem, number]>,
  updateRow: (block: CompiledBlock<[TItem, number]>, item: TItem, index: number) => void,
  depsOf?: (item: TItem, index: number) => unknown,
  updateCreatedRows = true,
): CompiledBlock<[readonly TItem[]]> {
  const fragment = document.createDocumentFragment();
  const anchor = document.createComment('auwla:keyed-map');
  const rows = new Map<TKey, AuwlaRowBlock<TItem>>();
  const orderedRows: AuwlaRowBlock<TItem>[] = [];
  let destroyableRows = 0;

  const block: CompiledBlock<[readonly TItem[]]> = {
    get node() {
      const frag = document.createDocumentFragment();
      for (const row of orderedRows) {
        frag.appendChild(row.node);
      }
      frag.appendChild(anchor);
      (frag as any).__auwlaGetNodes = () => {
        const nodes: Node[] = [];
        for (const row of orderedRows) {
          nodes.push(row.node);
        }
        nodes.push(anchor);
        return nodes;
      };
      return frag;
    },
    update(nextItems) {
      const parent = anchor.parentNode ?? fragment;

      if (nextItems.length === 0) {
        // Only delete the row range owned by this map. Calling replaceChildren()
        // on the parent can remove unrelated siblings around an embedded list.
        clearCompiledRows(rows, orderedRows, anchor, destroyableRows > 0);
        destroyableRows = 0;
        return;
      }

      // Check if there are any reused keys. If not, we can perform a highly optimized complete replace.
      let hasReused = false;
      for (let i = 0; i < nextItems.length; i++) {
        if (rows.has(keyOf(nextItems[i]!, i))) {
          hasReused = true;
          break;
        }
      }

      if (!hasReused) {
        clearCompiledRows(rows, orderedRows, anchor, destroyableRows > 0);
        destroyableRows = 0;

        const batch = document.createDocumentFragment();
        for (let index = 0; index < nextItems.length; index++) {
          const item = nextItems[index]!;
          const key = keyOf(item, index);
          const deps = depsOf ? depsOf(item, index) : null;
          const row: AuwlaRowBlock<TItem> = createRow(item, index);
          row.__auwlaKey = key;
          row.__auwlaItem = item;
          row.__auwlaDeps = deps;

          if (row.destroy) destroyableRows++;
          if (updateCreatedRows) updateRow(row, item, index);
          rows.set(key, row);
          orderedRows.push(row);
          batch.appendChild(row.node);
        }
        parent.insertBefore(batch, anchor);
        return;
      }

      let mismatchA = -1;
      let mismatchB = -1;
      let needsPlacement = false;

      if (orderedRows.length === 0) {
        const batch = document.createDocumentFragment();

        for (let index = 0; index < nextItems.length; index++) {
          const item = nextItems[index]!;
          const key = keyOf(item, index);
          const deps = depsOf ? depsOf(item, index) : null;
          const row: AuwlaRowBlock<TItem> = createRow(item, index);
          row.__auwlaKey = key;
          row.__auwlaItem = item;
          row.__auwlaDeps = deps;

          if (row.destroy) destroyableRows++;
          if (updateCreatedRows) updateRow(row, item, index);
          rows.set(key, row);
          orderedRows.push(row);
          batch.appendChild(row.node);
        }

        parent.insertBefore(batch, anchor);
        return;
      }

      if (orderedRows.length > 0 && nextItems.length > orderedRows.length) {
        let canAppend = true;

        for (let index = 0; index < orderedRows.length; index++) {
          const item = nextItems[index]!;
          const row = orderedRows[index]!;
          const sameItem = Object.is(row.__auwlaItem, item);
          const key = sameItem ? row.__auwlaKey : keyOf(item, index);

          if (!Object.is(row.__auwlaKey, key)) {
            canAppend = false;
            break;
          }

          const deps = depsOf ? depsOf(item, index) : null;
          if (!depsOf || !sameDeps(row.__auwlaDeps, deps)) {
            updateRow(row, item, index);
            row.__auwlaDeps = deps;
          } else {
            markBlockSeen(row);
          }
          row.__auwlaItem = item;
        }

        if (canAppend) {
          const batch = document.createDocumentFragment();

          for (let index = orderedRows.length; index < nextItems.length; index++) {
            const item = nextItems[index]!;
            const key = keyOf(item, index);
            const deps = depsOf ? depsOf(item, index) : null;
            const row: AuwlaRowBlock<TItem> = createRow(item, index);
            row.__auwlaKey = key;
            row.__auwlaItem = item;
            row.__auwlaDeps = deps;

            if (row.destroy) destroyableRows++;
            if (updateCreatedRows) updateRow(row, item, index);
            rows.set(key, row);
            orderedRows.push(row);
            batch.appendChild(row.node);
          }

          parent.insertBefore(batch, anchor);
          return;
        }
      }

      if (orderedRows.length === nextItems.length) {
        for (let index = 0; index < nextItems.length; index++) {
          const item = nextItems[index]!;
          const row = orderedRows[index]!;
          const sameItem = Object.is(row.__auwlaItem, item);
          const key = sameItem ? row.__auwlaKey : keyOf(item, index);

          if (Object.is(row.__auwlaKey, key)) {
            const deps = depsOf ? depsOf(item, index) : null;
            if (!depsOf || !sameDeps(row.__auwlaDeps, deps)) {
              updateRow(row, item, index);
              row.__auwlaDeps = deps;
            } else {
              markBlockSeen(row);
            }
            row.__auwlaItem = item;
            if (row.node.parentNode !== parent) needsPlacement = true;
            continue;
          }

          if (mismatchA === -1) mismatchA = index;
          else if (mismatchB === -1) mismatchB = index;
          else {
            mismatchB = -2;
            break;
          }
        }

        if (mismatchA === -1) {
          if (needsPlacement) {
            const nodes = orderedRows.map((row) => row.node);
            placeCompiledNodes(parent, nodes, anchor, nodes);
          }
          return;
        }

        if (
          mismatchB >= 0
          && Object.is(orderedRows[mismatchA]!.__auwlaKey, keyOf(nextItems[mismatchB]!, mismatchB))
          && Object.is(orderedRows[mismatchB]!.__auwlaKey, keyOf(nextItems[mismatchA]!, mismatchA))
        ) {
          const leftItem = nextItems[mismatchA]!;
          const rightItem = nextItems[mismatchB]!;
          const leftRow = orderedRows[mismatchA]!;
          const rightRow = orderedRows[mismatchB]!;
          const leftDeps = depsOf ? depsOf(leftItem, mismatchA) : null;
          const rightDeps = depsOf ? depsOf(rightItem, mismatchB) : null;

          if (!depsOf || !sameDeps(rightRow.__auwlaDeps, leftDeps)) {
            updateRow(rightRow, leftItem, mismatchA);
            rightRow.__auwlaDeps = leftDeps;
          } else {
            markBlockSeen(rightRow);
          }
          rightRow.__auwlaItem = leftItem;

          if (!depsOf || !sameDeps(leftRow.__auwlaDeps, rightDeps)) {
            updateRow(leftRow, rightItem, mismatchB);
            leftRow.__auwlaDeps = rightDeps;
          } else {
            markBlockSeen(leftRow);
          }
          leftRow.__auwlaItem = rightItem;

          swapCompiledRows(parent, orderedRows, mismatchA, mismatchB, anchor);
          return;
        }
      }

      const nextRows = new Map<TKey, AuwlaRowBlock<TItem>>();
      const orderedNodes: Node[] = [];
      const oldNodes = orderedRows.map((row) => row.node);
      let orderChanged = oldNodes.length !== nextItems.length;
      orderedRows.length = 0;

      for (let index = 0; index < nextItems.length; index++) {
        const item = nextItems[index]!;
        const key = keyOf(item, index);
        const deps = depsOf ? depsOf(item, index) : null;
        let row = rows.get(key);

        if (!row) {
          row = createRow(item, index);
          row.__auwlaKey = key;
          row.__auwlaItem = item;
          row.__auwlaDeps = deps;

          if (row.destroy) destroyableRows++;
          if (updateCreatedRows) updateRow(row, item, index);
        } else if (!depsOf || !sameDeps(row.__auwlaDeps, deps)) {
          updateRow(row, item, index);
          row.__auwlaDeps = deps;
        } else {
          markBlockSeen(row);
        }
        row.__auwlaItem = item;
        nextRows.set(key, row);
        orderedRows.push(row);
        orderedNodes.push(row.node);
        if (!orderChanged && oldNodes[index] !== row.node) orderChanged = true;
        if (!orderChanged && row.node.parentNode !== parent) orderChanged = true;
      }

      for (const [key, row] of rows) {
        if (nextRows.has(key)) continue;
        row.destroy?.();
        if (row.destroy) destroyableRows--;
        removeNode(row.node);
      }

      rows.clear();
      for (const [key, row] of nextRows) rows.set(key, row);

      if (orderChanged) {
        placeCompiledNodes(parent, orderedNodes, anchor, oldNodes);
      }
    },
    destroy() {
      for (const row of rows.values()) {
        row.destroy?.();
        removeNode(row.node);
      }
      rows.clear();
      orderedRows.length = 0;
      destroyableRows = 0;
      removeNode(anchor);
    },
  };

  fragment.appendChild(anchor);
  block.update(items);
  return block;
}
