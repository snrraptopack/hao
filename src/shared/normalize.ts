/**
 * @fileoverview Child normalization utilities.
 *
 * Normalizes the heterogeneous values Auwla accepts as children
 * (strings, numbers, nodes, arrays, fragments, render closures)
 * into a flat array of usable child values.
 */

/**
 * Normalize a child value into a flat array.
 *
 * - `null`, `undefined`, `true`, and `false` are filtered out.
 * - Nested arrays are flattened.
 * - `DocumentFragment` children are expanded into their child nodes.
 * - When `resolveClosures` is true, function children are invoked recursively.
 *
 * @param value - The raw child value.
 * @param resolveClosures - Whether to evaluate function children.
 * @returns A flat array of child values.
 * @internal
 */
export function normalizeChildren(value: unknown, resolveClosures = false): unknown[] {
  if (resolveClosures && typeof value === 'function') {
    return normalizeChildren(value(), true);
  }

  if (value instanceof DocumentFragment) {
    return Array.from(value.childNodes);
  }

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value.flat(Infinity)) {
      // Filter out all values that should produce no DOM node.
      // Includes '' (empty string) because patchChildren already strips
      // whitespace-only text nodes from oldChildren — keeping '' here would
      // misalign the two sides and cause adjacent elements to grab the wrong
      // existing DOM node during reconciliation.
      if (item === null || item === undefined || item === false || item === true || item === '') continue;
      out.push(item);
    }
    return out;
  }

  if (value === null || value === undefined || value === false || value === true || value === '') {
    return [];
  }

  return [value];
}
