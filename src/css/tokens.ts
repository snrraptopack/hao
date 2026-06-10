/**
 * @file tokens.ts
 * @description
 * Design token constructors for the Auwla CSS system.
 *
 * This module provides the building blocks for a centralized theme object.
 * All token values are typed primitives from the rest of the css module —
 * they compose and do arithmetic the same way as any other value.
 *
 * ## Runtime vs. compiler behaviour
 *
 * At runtime (Milestones 1–3) these functions construct and return typed
 * objects that the component reads directly. Every value is eagerly computed.
 *
 * At build time (Milestone 4) the Vite plugin resolves all token references
 * to concrete CSS strings. The token objects are never included in the
 * production bundle — they exist solely as a typed description of the design
 * system that the compiler reads from.
 *
 * ## Forward references in token definitions
 *
 * JavaScript evaluates object literals eagerly, so this will NOT work:
 *
 *   const theme = css.tokens({
 *     colors: {
 *       surface: css.color('#fff'),
 *       text: theme.colors.surface.contrast(),  // ❌ theme is undefined here
 *     }
 *   })
 *
 * Define derived tokens after the initial theme object, then spread:
 *
 *   const base = css.tokens({ colors: { surface: css.color('#fff') } });
 *   const theme = { ...base, colors: { ...base.colors, text: base.colors.surface.contrast() } };
 *
 * The compiler (Milestone 4) performs topological sort on token references
 * so build-time resolution is always correct regardless of definition order.
 */

import type { Color, Length, Shadow } from './types';
import { shadow } from './values';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options for css.scale() — a geometric spacing scale.
 * Each named step at index N = base * ratio^N.
 */
export type ScaleOptions<Steps extends string> = {
  /** Base unit value. All steps are computed from this. */
  base: Length;
  /** Multiplier between each step. 1.333 (perfect fourth) and 1.618 (golden ratio) are common. */
  ratio: number;
  /** Map of step names to their exponent index. */
  steps: Record<Steps, number>;
};

/** The output of css.scale() — a map of step names to computed Length values. */
export type SpacingScale<Steps extends string> = { readonly [K in Steps]: Length };

/**
 * Options for css.typeScale() — a typographic modular scale.
 * Negative indices produce sizes smaller than the base; positive produce larger.
 */
export type TypeScaleOptions<Steps extends string> = {
  /** Base font size (typically css.rem(1)). */
  base: Length;
  /** Ratio between scale steps. 1.25 (major third) is a common starting point. */
  ratio: number;
  /**
   * Named steps mapped to their exponent index.
   * Negative values (e.g. caption: -1) produce sub-base sizes.
   */
  steps: Record<Steps, number>;
  /**
   * When true, the compiler wraps each size in a clamp() expression that
   * smoothly scales between the computed value and a viewport-relative size.
   * At runtime this flag is a no-op — responsive sizing is applied at build time.
   */
  responsive?: boolean;
};

/** The output of css.typeScale() — a map of step names to computed Length values. */
export type TypeScale<Steps extends string> = { readonly [K in Steps]: Length };

/**
 * A single elevation level — describes the shadow depth relative to the base color.
 */
export type ElevationLevel = {
  /** Vertical shadow offset in pixels. Default 0. */
  y?: number;
  /** Horizontal shadow offset in pixels. Default 0. */
  x?: number;
  /** Shadow blur radius in pixels. Default 0. */
  blur?: number;
  /** Shadow spread radius in pixels. Default 0. */
  spread?: number;
};

/**
 * Options for css.elevation() — a shadow scale derived from a single base color.
 */
export type ElevationOptions = {
  /** Base shadow color. Typically a semi-transparent black or dark tone. */
  base: Color;
  /** Ordered levels from most subtle (index 0) to most elevated. */
  levels: ElevationLevel[];
};

/**
 * Options for css.spring() — spring physics converted to a CSS easing string.
 * Produces a CSS `linear()` function sampled from the spring differential equation.
 */
export type SpringOptions = {
  /**
   * Spring stiffness constant. Higher = snappier, faster to settle.
   * Typical range: 100–500. Default: 300.
   */
  stiffness?: number;
  /**
   * Damping coefficient. Higher = less oscillation.
   * At critical damping (≈ 2*sqrt(stiffness*mass)) there is no overshoot.
   * Typical range: 15–40. Default: 25.
   */
  damping?: number;
  /**
   * Mass of the simulated object. Affects how quickly it accelerates.
   * Rarely needs changing. Default: 1.
   */
  mass?: number;
};

// ---------------------------------------------------------------------------
// css.scale()
// ---------------------------------------------------------------------------

/**
 * Create a geometric spacing scale.
 * Each step value = `base * ratio^index`.
 *
 * @example
 * const spacing = css.scale({
 *   base:  css.rem(0.25),
 *   ratio: 1.333,
 *   steps: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
 * });
 * // spacing.sm → rem(0.444), spacing.md → rem(0.592) …
 *
 * spacing.md.add(css.px(4))  // arithmetic still works
 */
export function scale<Steps extends string>(
  options: ScaleOptions<Steps>,
): SpacingScale<Steps> {
  const result = {} as Record<Steps, Length>;

  for (const [name, index] of Object.entries(options.steps) as [Steps, number][]) {
    const factor = Math.pow(options.ratio, index);
    result[name] = options.base.multiply(factor);
  }

  return result as SpacingScale<Steps>;
}

// ---------------------------------------------------------------------------
// css.typeScale()
// ---------------------------------------------------------------------------

/**
 * Create a typographic modular scale.
 * Identical math to `css.scale()`, but semantically for font sizes.
 * Negative step indices produce sub-base sizes (captions, labels, etc.).
 *
 * The `responsive` flag is reserved for the compiler — at runtime it is ignored.
 * When the Vite plugin processes the token definition, responsive steps get
 * wrapped in `clamp()` expressions that smoothly scale with the viewport.
 *
 * @example
 * const type = css.typeScale({
 *   base:  css.rem(1),
 *   ratio: 1.25,
 *   steps: { caption: -1, body: 0, h4: 2, h3: 3, h2: 4, h1: 5 },
 *   responsive: true,
 * });
 * // type.h1 → rem(3.052), type.caption → rem(0.8)
 */
export function typeScale<Steps extends string>(
  options: TypeScaleOptions<Steps>,
): TypeScale<Steps> {
  const result = {} as Record<Steps, Length>;

  for (const [name, index] of Object.entries(options.steps) as [Steps, number][]) {
    const factor = Math.pow(options.ratio, index);
    result[name] = options.base.multiply(factor);
  }

  return result as TypeScale<Steps>;
}

// ---------------------------------------------------------------------------
// css.fontStack()
// ---------------------------------------------------------------------------

/**
 * Create a CSS font-family string from an ordered list of font names.
 * Multi-word names are automatically quoted.
 *
 * @example
 * css.fontStack(['Inter', 'system-ui', 'sans-serif'])
 * // → '"Inter", system-ui, sans-serif'
 *
 * css.fontStack(['JetBrains Mono', 'monospace'])
 * // → '"JetBrains Mono", monospace'
 */
export function fontStack(fonts: string[]): string {
  return fonts
    .map((f) => (f.includes(' ') ? `"${f}"` : f))
    .join(', ');
}

// ---------------------------------------------------------------------------
// css.elevation()
// ---------------------------------------------------------------------------

/**
 * Create a shadow scale from a single base color and an array of level descriptors.
 * Each level in the returned array becomes progressively more elevated.
 *
 * Access levels by numeric index: `theme.shadows[0]` (subtle), `theme.shadows[3]` (floating).
 *
 * @example
 * const shadows = css.elevation({
 *   base: css.color.black.alpha(0.08),
 *   levels: [
 *     { y: 1, blur: 3  },
 *     { y: 2, blur: 6  },
 *     { y: 4, blur: 12 },
 *     { y: 8, blur: 24 },
 *   ],
 * });
 * // shadows[0].toString() → "0 1px 3px 0 oklch(…)"
 */
export function elevation(options: ElevationOptions): Shadow[] {
  return options.levels.map((level) =>
    shadow({
      x:      level.x      ?? 0,
      y:      level.y      ?? 0,
      blur:   level.blur   ?? 0,
      spread: level.spread ?? 0,
      color:  options.base,
    }),
  );
}

// ---------------------------------------------------------------------------
// css.spring()
// ---------------------------------------------------------------------------

/**
 * Convert spring physics parameters to a CSS `linear()` easing function.
 *
 * The spring differential equation is sampled at 30 points and serialized
 * as a multi-stop CSS linear() function. This produces accurate spring curves
 * including overshoot, which cubic-bezier cannot express.
 *
 * **Browser support note:** CSS `linear()` requires Chrome 113+, Firefox 112+,
 * Safari 17.2+. For older targets, substitute `css.ease('spring')` which
 * falls back to a cubic-bezier approximation.
 *
 * @example
 * css.spring({ stiffness: 300, damping: 25 })
 * // → 'linear(0.0000 0.0%, 0.1823 3.3%, …)'
 *
 * css.spring({ stiffness: 500, damping: 30 })
 * // Snappier, less overshoot
 */
import { computeSpring } from './shared/spring';

export function spring(options: SpringOptions = {}): string {
  const { stiffness = 300, damping = 25, mass = 1 } = options;
  return computeSpring(stiffness, damping, mass);
}

// ---------------------------------------------------------------------------
// css.tokens()
// ---------------------------------------------------------------------------

/**
 * Define a typed design token map.
 *
 * At runtime this is an identity function — it returns the config object as-is.
 * The value is purely TypeScript: callers get exact type inference for every
 * nested token, so `theme.spacing.md` is `Length`, not `unknown`.
 *
 * At build time (Milestone 4) the Vite plugin reads this call to locate all
 * token definitions, resolves references to concrete values, and excludes the
 * token object from the production bundle entirely.
 *
 * @example
 * export const theme = css.tokens({
 *   colors: {
 *     primary: css.color.scale('#3b82f6', { 50: '#eff6ff', 500: '#3b82f6' }),
 *     surface: css.color('#ffffff'),
 *   },
 *   spacing: css.scale({ base: css.rem(0.25), ratio: 1.333, steps: { sm: 2, md: 3, lg: 4 } }),
 *   radius:  { sm: css.px(4), md: css.px(8), full: css.px(9999) },
 *   shadows: css.elevation({ base: css.color.black.alpha(0.08), levels: [{ y: 2, blur: 8 }] }),
 * });
 *
 * // Use anywhere:
 * import { theme } from './theme';
 * css({ padding: theme.spacing.md, background: theme.colors.surface })
 */
export function tokens<T extends Record<string, unknown>>(config: T): T {
  // Identity at runtime — type inference does the work.
  // Do NOT freeze here: the compiler may augment the object in M4,
  // and consumers may derive additional tokens by spreading.
  return config;
}
