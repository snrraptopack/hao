/**
 * @file serialize.ts
 * @description
 * Converts a StyleObject (containing typed Auwla CSS values) into a
 * ResolvedStyle (plain Record<string, string>) suitable for the browser's
 * `style` attribute or the `__setStyle` compiler-runtime helper.
 *
 * This module is the bridge between the typed value system and the DOM.
 * The Vite plugin will replace calls to `resolve()` with static string
 * literals at build time — at runtime this function only ever processes
 * the genuinely dynamic branches.
 *
 * Design note on shorthand arrays:
 *   padding: [css.rem(1), css.rem(2)]  →  "1rem 2rem"
 *   The browser receives the shorthand string; no individual longhands are set.
 */

import { BREAKPOINT_KEYS } from './breakpoints';
import type {
  Border,
  CalcExpression,
  ClampExpression,
  Color,
  CSSValue,
  FlexDescriptor,
  Gradient,
  GridDescriptor,
  Length,
  ResolvedStyle,
  Shadow,
  StyleObject,
  Time,
  Transform,
  Transition,
} from './types';

// ---------------------------------------------------------------------------
// Type guards — narrow CSSValue to specific tagged union members
// ---------------------------------------------------------------------------

function isTagged(v: unknown, tag: string): boolean {
  return typeof v === 'object' && v !== null && (v as Record<string, unknown>)['_tag'] === tag;
}

function isLength(v: CSSValue): v is Length {
  return isTagged(v, 'Length');
}
function isCalc(v: CSSValue): v is CalcExpression {
  return isTagged(v, 'Calc');
}
function isClamp(v: CSSValue): v is ClampExpression {
  return isTagged(v, 'Clamp');
}
function isTime(v: CSSValue): v is Time {
  return isTagged(v, 'Time');
}
function isColor(v: CSSValue): v is Color {
  return isTagged(v, 'Color');
}
function isGradient(v: CSSValue): v is Gradient {
  return isTagged(v, 'Gradient');
}
function isBorder(v: CSSValue): v is Border {
  return isTagged(v, 'Border');
}
function isShadow(v: CSSValue): v is Shadow {
  return isTagged(v, 'Shadow');
}
function isTransform(v: CSSValue): v is Transform {
  return isTagged(v, 'Transform');
}
function isTransition(v: CSSValue): v is Transition {
  return isTagged(v, 'Transition');
}
function isGrid(v: unknown): v is GridDescriptor {
  return isTagged(v, 'Grid');
}
function isFlex(v: unknown): v is FlexDescriptor {
  return isTagged(v, 'Flex');
}

// ---------------------------------------------------------------------------
// Shorthand array serialization
// ---------------------------------------------------------------------------

/**
 * Serialize an array of CSS values to a space-separated shorthand string.
 * Used for properties like padding, margin, inset, border-radius.
 *
 * @example
 * [css.rem(1), css.rem(2)]  →  "1rem 2rem"
 */
function serializeArray(
  arr: ReadonlyArray<Length | CalcExpression | string | number>,
): string {
  return arr
    .map((v) => {
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return String(v);
      return v.toString();
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Single-value serialization
// ---------------------------------------------------------------------------

/**
 * Convert one CSSValue to a CSS string.
 * Grid and Flex descriptors are NOT handled here — they expand to multiple
 * properties and are handled in the outer `resolve()` loop.
 */
/**
 * Strictly test whether a plain object is a responsive value wrapper.
 * Only objects whose keys are ALL breakpoints or `base` qualify.
 * This prevents nested StyleObjects (e.g. returned by css.when) from
 * being misidentified as responsive values.
 */
function isResponsiveValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || '_tag' in value) {
    return false;
  }
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length === 0) return false;
  return keys.every(key => BREAKPOINT_KEYS.has(key));
}

/**
 * Convert one CSSValue to a CSS string.
 * Grid and Flex descriptors are NOT handled here — they expand to multiple
 * properties and are handled in the outer `resolve()` loop.
 */
function serializeValue(value: CSSValue): string {
  // Responsive object literal — extract the fallback value.
  // At runtime we only have one viewport width, so we use `base` when
  // present, otherwise the first breakpoint value.
  if (isResponsiveValue(value)) {
    const responsive = value as unknown as Record<string, unknown>;
    const fallback =
      responsive.base !== undefined
        ? responsive.base
        : Object.values(responsive)[0];
    if (fallback !== undefined) {
      return serializeValue(fallback as CSSValue);
    }
    return '';
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (Array.isArray(value)) return serializeArray(value);

  if (
    isLength(value)  ||
    isCalc(value)    ||
    isClamp(value)   ||
    isTime(value)    ||
    isColor(value)   ||
    isGradient(value)||
    isBorder(value)  ||
    isShadow(value)  ||
    isTransform(value)||
    isTransition(value)
  ) {
    return value.toString();
  }

  // Fallback for untagged objects that carry a toString() method
  // (e.g. the object returned by css.outline()).
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toString?(): string }).toString === 'function'
  ) {
    return (value as { toString(): string }).toString();
  }

  return String(value);
}

// ---------------------------------------------------------------------------
// Public: resolve a full StyleObject → ResolvedStyle
// ---------------------------------------------------------------------------

/**
 * Resolve a StyleObject containing typed Auwla CSS values into a plain
 * `Record<string, string>` suitable for the DOM `style` attribute.
 *
 * Grid and Flex descriptors expand to multiple CSS properties.
 * All other values are serialized via `serializeValue()`.
 *
 * @example
 * resolve({ padding: css.px(16), background: css.color('#3b82f6') })
 * // → { padding: '16px', background: '#3b82f6' }
 */
export function resolve(style: StyleObject): ResolvedStyle {
  const result: ResolvedStyle = {};

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;

    // Grid descriptor → expand to multiple properties
    if (isGrid(value)) {
      Object.assign(result, (value as unknown as GridDescriptor).toProperties());
      continue;
    }

    // Flex descriptor → expand to multiple properties
    if (isFlex(value)) {
      Object.assign(result, (value as unknown as FlexDescriptor).toProperties());
      continue;
    }

    result[key] = serializeValue(value as CSSValue);
  }

  return result;
}
