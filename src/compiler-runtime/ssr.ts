/**
 * @fileoverview Server-side rendering helpers for compiled output.
 *
 * These functions are called by code generated with `ssr: true` to
 * produce HTML strings instead of DOM mutations.
 */

/** @internal */
export function __ssrBlock(fn: () => string): string {
  return fn();
}

/** @internal */
export function __ssrNode(node: unknown): string {
  return String(node ?? '');
}

/** @internal */
export function __ssrKeyedMap(): { toString(): string } {
  return { toString: () => '' };
}

/** @internal */
export function __escapeHtml(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
