/**
 * @fileoverview Keyed list runtime for compiled output.
 *
 * Reuses row blocks by key, creates blocks only for new keys, moves
 * existing DOM nodes with an LIS reorder strategy, and skips row
 * updates when dependency arrays are unchanged.
 */

import type { CompiledBlock } from './block';
import { removeNode } from './dom-setters';
import { NO_INDEX } from '../shared/constants';
import { sameDeps } from '../shared/deps';
import { longestIncreasingSubsequence } from '../shared/lis';

/** @internal */
type Row<TItem> = {
  key: unknown;
  item: TItem;
  block: CompiledBlock<[TItem, number]>;
  deps: unknown;
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
  orderedRows: Row<TItem>[],
  leftIndex: number,
  rightIndex: number,
  anchor: Node,
) {
  const left = orderedRows[leftIndex]!;
  const right = orderedRows[rightIndex]!;
  const afterRight = orderedRows[rightIndex + 1]?.block.node ?? anchor;

  parent.insertBefore(right.block.node, left.block.node);
  parent.insertBefore(left.block.node, afterRight);

  orderedRows[leftIndex] = right;
  orderedRows[rightIndex] = left;
}

/** @internal */
function clearCompiledRows<TItem>(
  rows: Map<unknown, Row<TItem>>,
  orderedRows: Row<TItem>[],
  anchor: Node,
  hasDestroyableRows: boolean,
) {
  if (orderedRows.length === 0) return;

  if (hasDestroyableRows) {
    for (const row of orderedRows) {
      if (row.block.destroy) row.block.destroy();
    }
  }

  const first = orderedRows[0]!.block.node;
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
    for (const row of orderedRows) removeNode(row.block.node);
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
  const rows = new Map<TKey, Row<TItem>>();
  const orderedRows: Row<TItem>[] = [];
  let destroyableRows = 0;

  const block: CompiledBlock<[readonly TItem[]]> = {
    node: fragment,
    update(nextItems) {
      const parent = anchor.parentNode ?? fragment;

      if (nextItems.length === 0) {
        // Only delete the row range owned by this map. Calling replaceChildren()
        // on the parent can remove unrelated siblings around an embedded list.
        clearCompiledRows(rows, orderedRows, anchor, destroyableRows > 0);
        destroyableRows = 0;
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
          const row = { key, item, block: createRow(item, index), deps };
          if (row.block.destroy) destroyableRows++;
          if (updateCreatedRows) updateRow(row.block, item, index);
          rows.set(key, row);
          orderedRows.push(row);
          batch.appendChild(row.block.node);
        }

        parent.insertBefore(batch, anchor);
        return;
      }

      if (orderedRows.length > 0 && nextItems.length > orderedRows.length) {
        let canAppend = true;

        for (let index = 0; index < orderedRows.length; index++) {
          const item = nextItems[index]!;
          const row = orderedRows[index]!;
          const sameItem = Object.is(row.item, item);
          const key = sameItem ? row.key : keyOf(item, index);

          if (!Object.is(row.key, key)) {
            canAppend = false;
            break;
          }

          const deps = depsOf ? depsOf(item, index) : null;
          if (!depsOf || !sameDeps(row.deps, deps)) {
            updateRow(row.block, item, index);
            row.deps = deps;
          }
          row.item = item;
        }

        if (canAppend) {
          const batch = document.createDocumentFragment();

          for (let index = orderedRows.length; index < nextItems.length; index++) {
            const item = nextItems[index]!;
            const key = keyOf(item, index);
            const deps = depsOf ? depsOf(item, index) : null;
            const row = { key, item, block: createRow(item, index), deps };
            if (row.block.destroy) destroyableRows++;
            if (updateCreatedRows) updateRow(row.block, item, index);
            rows.set(key, row);
            orderedRows.push(row);
            batch.appendChild(row.block.node);
          }

          parent.insertBefore(batch, anchor);
          return;
        }
      }

      if (orderedRows.length === nextItems.length) {
        for (let index = 0; index < nextItems.length; index++) {
          const item = nextItems[index]!;
          const row = orderedRows[index]!;
          const sameItem = Object.is(row.item, item);
          const key = sameItem ? row.key : keyOf(item, index);

          if (Object.is(row.key, key)) {
            const deps = depsOf ? depsOf(item, index) : null;
            if (!depsOf || !sameDeps(row.deps, deps)) {
              updateRow(row.block, item, index);
              row.deps = deps;
            }
            row.item = item;
            if (row.block.node.parentNode !== parent) needsPlacement = true;
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
            const nodes = orderedRows.map((row) => row.block.node);
            placeCompiledNodes(parent, nodes, anchor, nodes);
          }
          return;
        }

        if (
          mismatchB >= 0
          && Object.is(orderedRows[mismatchA]!.key, keyOf(nextItems[mismatchB]!, mismatchB))
          && Object.is(orderedRows[mismatchB]!.key, keyOf(nextItems[mismatchA]!, mismatchA))
        ) {
          const leftItem = nextItems[mismatchA]!;
          const rightItem = nextItems[mismatchB]!;
          const leftRow = orderedRows[mismatchA]!;
          const rightRow = orderedRows[mismatchB]!;
          const leftDeps = depsOf ? depsOf(leftItem, mismatchA) : null;
          const rightDeps = depsOf ? depsOf(rightItem, mismatchB) : null;

          if (!depsOf || !sameDeps(rightRow.deps, leftDeps)) {
            updateRow(rightRow.block, leftItem, mismatchA);
            rightRow.deps = leftDeps;
          }
          rightRow.item = leftItem;

          if (!depsOf || !sameDeps(leftRow.deps, rightDeps)) {
            updateRow(leftRow.block, rightItem, mismatchB);
            leftRow.deps = rightDeps;
          }
          leftRow.item = rightItem;

          swapCompiledRows(parent, orderedRows, mismatchA, mismatchB, anchor);
          return;
        }
      }

      const nextRows = new Map<TKey, Row<TItem>>();
      const orderedNodes: Node[] = [];
      const oldNodes = orderedRows.map((row) => row.block.node);
      let orderChanged = oldNodes.length !== nextItems.length;
      orderedRows.length = 0;

      for (let index = 0; index < nextItems.length; index++) {
        const item = nextItems[index]!;
        const key = keyOf(item, index);
        const deps = depsOf ? depsOf(item, index) : null;
        let row = rows.get(key);

        if (!row) {
          row = { key, item, block: createRow(item, index), deps };
          if (row.block.destroy) destroyableRows++;
          if (updateCreatedRows) updateRow(row.block, item, index);
        } else if (!depsOf || !sameDeps(row.deps, deps)) {
          updateRow(row.block, item, index);
          row.deps = deps;
        }
        row.item = item;
        nextRows.set(key, row);
        orderedRows.push(row);
        orderedNodes.push(row.block.node);
        if (!orderChanged && oldNodes[index] !== row.block.node) orderChanged = true;
        if (!orderChanged && row.block.node.parentNode !== parent) orderChanged = true;
      }

      for (const [key, row] of rows) {
        if (nextRows.has(key)) continue;
        row.block.destroy?.();
        if (row.block.destroy) destroyableRows--;
        removeNode(row.block.node);
      }

      rows.clear();
      for (const [key, row] of nextRows) rows.set(key, row);

      if (orderChanged) {
        placeCompiledNodes(parent, orderedNodes, anchor, oldNodes);
      }
    },
    destroy() {
      for (const row of rows.values()) {
        row.block.destroy?.();
        removeNode(row.block.node);
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
