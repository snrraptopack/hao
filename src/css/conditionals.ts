/**
 * @file conditionals.ts
 * @description
 * `css.when()` and `css.match()` — pure conditional style functions.
 *
 * Both functions are plain value transformers at runtime:
 *   - They receive style objects or CSS values and return one of them.
 *   - No subscriptions, no reactive system, no hooks.
 *   - Component state is managed as plain variables; re-render calls these
 *     functions again and gets a new plain object.
 *
 * ## Why this shape matters for the compiler
 *
 * The Vite plugin (Milestone 4) will walk `css.when()` and `css.match()` call
 * sites in the AST and enumerate their branches statically:
 *   - `css.when`  → two classes emitted (true-branch, false/default-branch)
 *   - `css.match` → one class emitted per key in the cases object
 *
 * At runtime after the compiler runs, these calls become class lookups instead
 * of function calls. The call site API is identical — the compiler rewrites
 * the internals, not the call.
 *
 * ## Runtime limitation of css.when() with multiple conditions
 *
 * JavaScript converts computed boolean property keys to the strings 'true' and
 * 'false'. If you write:
 *
 *   css.when({ [condA]: styleA, [condB]: styleB, default: styleC })
 *
 * ...and both condA and condB are true, only the LAST one assigned to key
 * 'true' survives in the object literal. At runtime, use separate css.when()
 * calls for independent conditions. The compiler rewrites these to independent
 * class toggles at Milestone 4, so the final behaviour is correct in production.
 */

import type { CSSValue, StyleObject } from './types';
import { merge } from './compose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WhenBranches<V> = {
  true?: V;
  false?: V;
};

/**
 * The cases object for css.match().
 *
 * Every member of the union type T must be a key. TypeScript will error at
 * compile time if a variant is added to T without adding a matching key here.
 * The compiler uses this exhaustiveness to enumerate the full class set.
 *
 * @example
 * type Variant = 'primary' | 'secondary' | 'ghost';
 * css.match(variant, {
 *   primary:   { background: blue },
 *   secondary: { background: 'transparent', border: css.border({ color: blue }) },
 *   ghost:     { background: 'transparent', border: css.border.none() },
 * })
 */
export type MatchCases<T extends string | number | boolean, V> = {
  [K in T as K extends boolean ? `${K}` : K]: V;
};

// ---------------------------------------------------------------------------
// css.when()
// ---------------------------------------------------------------------------

/**
 * Return a style (or value) based on a boolean condition.
 *
 * @example
 * // Single-property inline
 * opacity: css.when(disabled, { true: 0.5, false: 1 })
 *
 * // Multi-property branch
 * css.when(isHovered, {
 *   true: { background: blue.lighten(0.1), transform: css.transform({ scale: 1.02 }) },
 *   false: { background: blue }
 * })
 */
export function when<V>(condition: boolean, branches: WhenBranches<V>): V {
  if (condition) {
    return (branches.true !== undefined ? branches.true : {} as V) as V;
  } else {
    return (branches.false !== undefined ? branches.false : {} as V) as V;
  }
}

// ---------------------------------------------------------------------------
// css.match()
// ---------------------------------------------------------------------------

/**
 * Return a style (or value) based on which variant of a union type is active.
 *
 * TypeScript enforces that every member of T has a corresponding key in cases.
 * If you extend the union, TS will error at every css.match() call that does
 * not yet handle the new variant — this is intentional exhaustiveness checking.
 *
 * **How the compiler uses it (Milestone 4/5):**
 * The plugin reads the T type from the AST, enumerates all union members, emits
 * one CSS class per member, and replaces the call with a lookup table at runtime.
 *
 * @example
 * // Discriminated union on a string prop
 * css.match(props.variant, {
 *   primary:   { background: theme.colors.primary },
 *   secondary: { background: 'transparent' },
 *   ghost:     { background: 'transparent', opacity: 0.7 },
 * })
 *
 * // Single-value match (used inside css.define())
 * const cardStyle = css.define((props: { size: 'sm' | 'md' | 'lg' }) => ({
 *   padding: css.match(props.size, { sm: css.px(8), md: css.px(16), lg: css.px(24) }),
 * }))
 */
export function match<T extends string | number | boolean, V extends StyleObject>(
  value: T,
  cases: MatchCases<T, V>,
): V;
export function match<T extends string | number | boolean, V extends CSSValue>(
  value: T,
  cases: MatchCases<T, V>,
): V;
export function match<T extends string | number | boolean, V extends StyleObject | CSSValue>(
  value: T,
  cases: MatchCases<T, V>,
): V {
  // Safe cast — MatchCases<T, V> guarantees the key exists for any T
  const key = String(value);
  const result = (cases as Record<string, V>)[key];

  // Guard against impossible runtime mismatches (e.g. value from an untyped source)
  if (result === undefined) {
    throw new Error(
      `css.match: no case for "${String(value)}". ` +
      `Available: ${Object.keys(cases).join(', ')}`,
    );
  }

  return result;
}


// ---------------------------------------------------------------------------
// css.mergeWhen() — convenience for composing multiple independent conditions
// ---------------------------------------------------------------------------

/**
 * Apply multiple independent boolean conditions in a single call.
 * Each entry is a `[condition, trueStyle]` pair; the false branch is always `{}`.
 * Results are merged in order — later entries win on property conflict.
 *
 * This is syntactic sugar for repeated `css.merge(css.when(...), css.when(...))` calls.
 * The compiler treats each pair as an independent branch point.
 *
 * @example
 * css.mergeWhen([
 *   [isSelected, { outline: css.outline({ color: blue, width: 2 }) }],
 *   [isDragging, { opacity: 0.6, transform: css.transform({ scale: 0.98 }) }],
 *   [isDisabled, { opacity: 0.4, cursor: 'not-allowed' }],
 * ])
 */
export function mergeWhen(
  conditions: ReadonlyArray<[boolean, StyleObject]>,
): StyleObject {
  const styles = conditions
    .filter(([condition]) => condition)
    .map(([, style]) => style);

  return merge(...styles);
}
