import { describe, expect, test } from 'vitest';
import { longestIncreasingSubsequence } from '../../src/shared/lis';
import { NO_INDEX } from '../../src/shared/constants';

describe('longestIncreasingSubsequence', () => {
  test('returns empty for all NO_INDEX', () => {
    expect(longestIncreasingSubsequence([NO_INDEX, NO_INDEX, NO_INDEX])).toEqual([]);
  });

  test('returns all indexes for already increasing sequence', () => {
    expect(longestIncreasingSubsequence([0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
  });

  test('finds LIS for reversed sequence', () => {
    // Reversed: [3, 2, 1, 0] — LIS is any single element
    const result = longestIncreasingSubsequence([3, 2, 1, 0]);
    expect(result.length).toBe(1);
  });

  test('finds LIS with gaps', () => {
    // [0, 2, 1, 3] — LIS is [0, 2, 3] or [0, 1, 3]
    const result = longestIncreasingSubsequence([0, 2, 1, 3]);
    expect(result.length).toBe(3);
    expect(result).toEqual([0, 2, 3]);
  });

  test('skips NO_INDEX values', () => {
    // [0, NO_INDEX, 1, 2] — LIS is [0, 2, 3]
    expect(longestIncreasingSubsequence([0, NO_INDEX, 1, 2])).toEqual([0, 2, 3]);
  });

  test('handles mixed stable and new items', () => {
    // Simulates keyed list: 3 items, middle one is new
    // old indexes: [0, NO_INDEX, 2]
    expect(longestIncreasingSubsequence([0, NO_INDEX, 2])).toEqual([0, 2]);
  });

  test('handles swap pattern', () => {
    // Two items swapped: [1, 0]
    const result = longestIncreasingSubsequence([1, 0]);
    expect(result.length).toBe(1);
  });

  test('handles empty array', () => {
    expect(longestIncreasingSubsequence([])).toEqual([]);
  });

  test('handles single element', () => {
    expect(longestIncreasingSubsequence([5])).toEqual([0]);
  });

  test('handles duplicate values', () => {
    // [0, 1, 1, 2] — LIS length is 3; exact indexes depend on tie-breaking
    const result = longestIncreasingSubsequence([0, 1, 1, 2]);
    expect(result.length).toBe(3);
  });
});
