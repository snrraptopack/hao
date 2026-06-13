/**
 * @file shared/length.ts
 * @description
 * Shared length formatting and parsing utilities used by runtime and compiler.
 */

import type { Length } from '../types';
import { px } from '../units';

/**
 * Convert a number or Length into a Length, using a fallback for undefined.
 */
export function toLength(v: number | Length | undefined, fallback = 0): Length {
  if (v === undefined) return px(fallback);
  return typeof v === 'number' ? px(v) : v;
}

/**
 * Format a value to a CSS length string.
 * - undefined / null → empty string (or fallback if provided)
 * - number → 'Npx' (or '0' for zero)
 * - Length → toString()
 * - string → pass through
 */
export function formatLength(val: unknown, fallback?: string): string {
  if (val === undefined || val === null) {
    return fallback ?? '';
  }
  if (typeof val === 'number') {
    return val === 0 ? '0' : `${val}px`;
  }
  if (typeof val === 'object' && val !== null && typeof (val as Length).toString === 'function') {
    const str = (val as Length).toString();
    if (str !== '[object Object]') return str;
  }
  return String(val);
}

/**
 * Parse a CSS length string like '16px' or '1.5rem' into value and unit.
 * Defaults to `{ value: 0, unit: 'px' }` when parsing fails.
 */
export function parseLength(val: unknown): { value: number; unit: string } {
  if (typeof val === 'number') return { value: val, unit: 'px' };
  const str = String(val);
  const match = str.match(/^-?(\d+(?:\.\d+)?|\.\d+)([a-zA-Z%]*)$/);
  if (match && match[1] !== undefined) {
    return { value: parseFloat(match[1]), unit: match[2] || 'px' };
  }
  return { value: 0, unit: 'px' };
}
