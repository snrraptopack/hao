/**
 * @fileoverview Structural equality for plain (JSON-ish) data.
 *
 * Used by track's stale-while-revalidate comparisons. Replaces
 * `JSON.stringify(a) === JSON.stringify(b)` (P4): object key order does not
 * matter here, and circular structures or `BigInt` values no longer throw.
 */

/**
 * Deep structural equality for primitives, arrays, plain objects, and Dates.
 *
 * - Object keys are order-insensitive.
 * - `NaN` equals `NaN`; functions and symbols compare by identity.
 * - Cyclic graphs are compared co-inductively (structurally equal cycles
 *   count as equal) instead of throwing.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return eq(a, b, new Map());
}

function eq(a: unknown, b: unknown, seen: Map<object, object>): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  // Already comparing this exact pair further up the stack — co-inductive
  // success for cycles.
  if (seen.get(a) === b) return true;
  seen.set(a, b);

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!eq(a[i], b[i], seen)) return false;
    }
    return true;
  }

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!eq((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], seen)) {
      return false;
    }
  }
  return true;
}
