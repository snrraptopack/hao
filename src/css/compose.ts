/**
 * @file compose.ts
 * @description
 * Style composition helpers: merge, extend, and css.define().
 *
 * ## css.define() — same-file composability
 *
 * At Milestone 1, `css.define(styleObject)` is an identity function: it takes
 * a StyleObject and returns it typed. The value is ergonomic — you can name
 * and reuse fragments without putting everything inline in JSX.
 *
 * The Vite plugin will target this call in Milestone 4/5. The API is identical
 * in both lives, so there is zero migration cost when static extraction arrives.
 *
 * ## merge vs extend
 *
 * `merge(a, b, c)` — shallow-merges style objects; later entries win on conflict.
 *                    Use for ad-hoc style combination at call sites.
 *
 * `extend(base, overrides)` — same as merge(base, overrides) but signals design
 *                             intent: "base" is the authoritative source and
 *                             "overrides" are intentional divergences from it.
 *                             The compiler uses this distinction for tree-shaking.
 */

import type { StyleObject } from './types';
import {
  above as bpAbove,
  below as bpBelow,
  matchBreakpoint as bpMatch,
  between as bpBetween,
} from './shared/breakpoints';


// ---------------------------------------------------------------------------
// merge
// ---------------------------------------------------------------------------

/**
 * Shallow-merge two or more StyleObjects.
 * Properties from later arguments override earlier ones.
 * Returns a new object — inputs are never mutated.
 *
 * ## Shallow behavior note
 * Nested selectors (e.g. `:hover`, `& > li`, `@media...`) are replaced as
 * whole objects; their contents are **not** deep-merged. If both inputs
 * define the same nested key, the later input wins completely.
 *
 * @example
 * const cardWithFocus = css.merge(withCard, withFocusRing, { maxWidth: css.px(400) })
 *
 * // Nested selector replacement, not deep merge:
 * css.merge({ ':hover': { color: 'blue' } }, { ':hover': { background: 'red' } })
 * // → { ':hover': { background: 'red' } }
 */
export function merge(...styles: StyleObject[]): StyleObject {
  return Object.assign({}, ...styles);
}

// ---------------------------------------------------------------------------
// extend
// ---------------------------------------------------------------------------

/**
 * Extend a base StyleObject with overrides.
 * Semantically equivalent to `merge(base, overrides)`, but the name communicates
 * that `base` is an authoritative source and the override is intentional.
 *
 * @example
 * const primaryButton = css.extend(baseButton, {
 *   background: theme.colors.primary,
 *   color: theme.colors.primary.contrast(),
 * })
 */
export function extend(base: StyleObject, overrides: StyleObject): StyleObject {
  return merge(base, overrides);
}

// ---------------------------------------------------------------------------
// define — static form (Milestone 1)
// ---------------------------------------------------------------------------

/**
 * Define a named, reusable style fragment.
 *
 * At runtime this is an identity function — it takes a StyleObject and returns
 * it typed. The purpose is ergonomic: name your style fragments at the top of a
 * file rather than inlining everything in JSX.
 *
 * The Vite plugin (Milestone 4) will scan `css.define()` call sites and extract
 * static styles into a CSS file. The call site API never changes.
 *
 * @example
 * // Top of button.tsx — no separate .styles.ts file needed yet
 * const base = css.define({
 *   borderRadius: css.px(4),
 *   cursor: 'pointer',
 * })
 *
 * const primary = css.define({
 *   background: css.color('#3b82f6'),
 *   color: css.color('#fff'),
 * })
 *
 * return () => (
 *   <button style={css.merge(base, primary)}>Click</button>
 * )
 */
export function define(style: StyleObject): StyleObject;

/**
 * Define a parameterized style fragment.
 *
 * The function is called at runtime with the props object and returns a plain
 * StyleObject. This overload ships in Milestone 2 alongside css.match().
 *
 * The Vite plugin (Milestone 5) will enumerate the TypeScript type union of T,
 * emit one CSS class per combination, and replace runtime calls with a class
 * lookup table. The call site never changes.
 *
 * @example
 * const cardStyle = css.define((props: { size: 'sm' | 'md' | 'lg' }) => ({
 *   padding: css.match(props.size, { sm: css.px(8), md: css.px(16), lg: css.px(24) }),
 * }))
 *
 * // Later:
 * <div style={cardStyle({ size: 'md' })} />
 */
export function define<T extends object>(factory: (props: T) => StyleObject): (props: T) => StyleObject;

// Implementation — handles both overloads
export function define<T extends object>(
  styleOrFactory: StyleObject | ((props: T) => StyleObject),
): StyleObject | ((props: T) => StyleObject) {
  // Parameterized form: return the factory as-is.
  // The compiler will rewrite call sites; runtime just calls the function.
  if (typeof styleOrFactory === 'function') {
    return styleOrFactory;
  }

  // Static form: identity — return the object as-is.
  // Returning the same reference keeps object identity stable,
  // which matters for future compiler equality checks.
  return styleOrFactory;
}

/**
 * Create a child selector string for nesting.
 *
 * @example
 * [css.children('li')]: { padding: css.px(8) }
 */
export function children(selector: string): string {
  return `& > ${selector}`;
}

/**
 * Create a pseudo-class selector string for nesting.
 *
 * @example
 * [css.pseudo('first-child')]: { borderTop: 'none' }
 */
export function pseudo(name: string): string {
  return `&:${name}`;
}

// ---------------------------------------------------------------------------
// Advanced Selectors & Responsive Range Helpers
// ---------------------------------------------------------------------------



/**
 * A chainable selector builder used for nested style keys.
 *
 * **Type note:** The `string & {...}` intersection is a TypeScript-level
 * convenience so that `[css.child('li')]` works as a computed property key.
 * At runtime this is a plain object; JS coerces it to a string via
 * `Symbol.toPrimitive` / `toString()` when used as a property name.
 *
 * The `string &` intersection is intentional: it lets TypeScript accept the
 * builder as a computed property key while still exposing the chainable
 * methods for autocomplete. At runtime the value is not actually a string
 * primitive; it only needs to be string-coercible.
 */
export type SelectorBuilder = string & {
  readonly first: SelectorBuilder;
  readonly last: SelectorBuilder;
  readonly hover: SelectorBuilder;
  readonly active: SelectorBuilder;
  readonly focus: SelectorBuilder;
  readonly before: SelectorBuilder;
  readonly after: SelectorBuilder;
  pseudo(name: string): SelectorBuilder;
  nth(n: number | string): SelectorBuilder;
};

class SelectorBuilderImpl {
  private parts: string[];

  constructor(parts: string[]) {
    this.parts = parts;
  }

  get first(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, ':first-child']) as unknown as SelectorBuilder; }
  get last(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, ':last-child']) as unknown as SelectorBuilder; }
  get hover(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, ':hover']) as unknown as SelectorBuilder; }
  get active(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, ':active']) as unknown as SelectorBuilder; }
  get focus(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, ':focus']) as unknown as SelectorBuilder; }
  get before(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, '::before']) as unknown as SelectorBuilder; }
  get after(): SelectorBuilder { return new SelectorBuilderImpl([...this.parts, '::after']) as unknown as SelectorBuilder; }

  pseudo(name: string): SelectorBuilder {
    return new SelectorBuilderImpl([...this.parts, `:${name}`]) as unknown as SelectorBuilder;
  }

  nth(n: number | string): SelectorBuilder {
    return new SelectorBuilderImpl([...this.parts, `:nth-child(${n})`]) as unknown as SelectorBuilder;
  }

  toString(): string {
    return this.parts.join('');
  }

  [Symbol.toPrimitive](_hint: string): string {
    return this.parts.join('');
  }
}

export function child(selector: string): SelectorBuilder {
  return new SelectorBuilderImpl(['& > ', selector]) as unknown as SelectorBuilder;
}

export function descendant(selector: string): SelectorBuilder {
  return new SelectorBuilderImpl(['& ', selector]) as unknown as SelectorBuilder;
}

export function sibling(selector: string): SelectorBuilder {
  return new SelectorBuilderImpl(['& + ', selector]) as unknown as SelectorBuilder;
}

export const above = bpAbove;
export const below = bpBelow;
export const matchBreakpoint = bpMatch;
export const between = bpBetween;
