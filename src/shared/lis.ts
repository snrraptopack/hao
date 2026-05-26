/**
 * @fileoverview Longest Increasing Subsequence (LIS) utility for minimal DOM moves.
 *
 * Used by keyed reconciliation to determine the longest stable subsequence of
 * nodes so that only the minimum number of insertBefore calls are needed.
 */

import { NO_INDEX } from './constants';

/**
 * Computes the longest increasing subsequence of indexes.
 * @param values - Array where each value is an old index or NO_INDEX.
 * @returns Indexes forming the LIS (stable nodes that stay in place).
 * @internal
 */
export function longestIncreasingSubsequence(values: number[]): number[] {
  const predecessors = new Array<number>(values.length);
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i]!;
    if (value === NO_INDEX) continue;

    let low = 0;
    let high = result.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (values[result[mid]!]! < value) low = mid + 1;
      else high = mid;
    }

    if (low > 0) predecessors[i] = result[low - 1]!;
    result[low] = i;
  }

  let cursor = result.length ? result[result.length - 1]! : NO_INDEX;
  for (let i = result.length - 1; i >= 0; i--) {
    result[i] = cursor;
    cursor = predecessors[cursor] ?? NO_INDEX;
  }

  return result;
}
