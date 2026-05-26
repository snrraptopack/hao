/**
 * @fileoverview Keyed children reconciliation.
 *
 * After the patcher matches old and new children, this module places
 * the resulting nodes using a longest-increasing-subsequence (LIS)
 * strategy so that only the minimum number of DOM moves are performed.
 */

import { NO_INDEX } from '../shared/constants';
import { longestIncreasingSubsequence } from '../shared/lis';

/**
 * Reorder `nodes` inside `parent` so they match the desired sequence.
 *
 * Nodes that already appear in the correct relative order (the LIS)
 * are left untouched. Every other node is moved with `insertBefore`.
 *
 * @param parent - The parent node whose children are being reconciled.
 * @param nodes - The final ordered list of child nodes.
 * @param oldChildren - The previous list of child nodes (used to compute LIS).
 * @internal
 */
export function placePatchedNodes(parent: Node, nodes: Node[], oldChildren: Node[]) {
  const oldIndexes = new Map<Node, number>();
  for (let i = 0; i < oldChildren.length; i++) oldIndexes.set(oldChildren[i]!, i);

  const indexes = nodes.map((node) => oldIndexes.get(node) ?? NO_INDEX);
  const stableIndexes = longestIncreasingSubsequence(indexes);
  let stableCursor = stableIndexes.length - 1;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]!;
    const anchor = nodes[i + 1] ?? null;
    const isStable = stableCursor >= 0 && stableIndexes[stableCursor] === i;

    if (isStable && node.parentNode === parent) {
      stableCursor--;
      continue;
    }

    if (node.parentNode !== parent || node.nextSibling !== anchor) {
      parent.insertBefore(node, anchor);
    }
  }
}
