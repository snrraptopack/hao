/**
 * @fileoverview Dependency comparison utilities for memoization and keyed lists.
 */

/**
 * Compare two arrays for equality using Object.is on each element.
 * @internal
 */
export function sameArrayDeps(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Compare two dependency values. Arrays are compared element-wise;
 * scalars are compared with Object.is.
 * @internal
 */
export function sameDeps(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return sameArrayDeps(a, b);
  return Object.is(a, b);
}
