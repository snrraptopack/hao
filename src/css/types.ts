/**
 * @file types.ts
 * @description
 * Shared type definitions for the Auwla CSS value system.
 * All other modules in src/css import from here — keep this file free of
 * implementation logic so there are no circular dependencies.
 */

// ---------------------------------------------------------------------------
// Length units
// ---------------------------------------------------------------------------

/** All CSS length/dimension unit strings the system supports. */
export type LengthUnit =
  | 'px'
  | 'rem'
  | 'em'
  | 'vw'
  | 'vh'
  | 'vmin'
  | 'vmax'
  | 'pct'   // maps to '%' in serialization
  | 'fr'
  | 'ch'
  | 'ex';

/** Time unit — only milliseconds are used internally; 's' is a convenience. */
export type TimeUnit = 'ms' | 's';

/** Angle unit. */
export type AngleUnit = 'deg' | 'rad' | 'turn';

// ---------------------------------------------------------------------------
// Branded value objects
// ---------------------------------------------------------------------------

/**
 * A typed CSS length value (e.g. 16px, 1.5rem).
 * Arithmetic methods return a new Length or a CalcExpression when units differ.
 */
export interface Length {
  readonly _tag: 'Length';
  readonly value: number;
  readonly unit: LengthUnit;

  /** Add another length. Same unit → Length; mixed units → CalcExpression. */
  add(other: Length): Length | CalcExpression;
  /** Subtract another length. Same unit → Length; mixed units → CalcExpression. */
  subtract(other: Length): Length | CalcExpression;
  /** Multiply by a scalar. Always returns a Length. */
  multiply(factor: number): Length;
  /** Divide by a scalar. Always returns a Length. */
  divide(divisor: number): Length;

  /** Serialize to a CSS string (e.g. "16px", "50%", "1fr"). */
  toString(): string;
}

/**
 * A CSS calc() expression produced when arithmetic mixes incompatible units.
 * The compiler resolves these at build time when both operands are statically known.
 */
export interface CalcExpression {
  readonly _tag: 'Calc';
  readonly expression: string;

  toString(): string;
}

/**
 * A CSS clamp() expression.
 * Produced by css.clamp(min, preferred, max).
 */
export interface ClampExpression {
  readonly _tag: 'Clamp';
  readonly min: Length | CalcExpression;
  readonly preferred: Length | CalcExpression;
  readonly max: Length | CalcExpression;

  toString(): string;
}

/** A typed CSS time value (e.g. 200ms). */
export interface Time {
  readonly _tag: 'Time';
  readonly value: number;
  readonly unit: TimeUnit;

  add(other: Time): Time;
  multiply(factor: number): Time;

  toString(): string;
}

/** A typed CSS angle value (e.g. 45deg). */
export interface Angle {
  readonly _tag: 'Angle';
  readonly value: number;
  readonly unit: AngleUnit;

  add(other: Angle): Angle;
  subtract(other: Angle): Angle;
  multiply(factor: number): Angle;
  divide(divisor: number): Angle;
  toString(): string;
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

/**
 * A typed CSS color value.
 * All manipulation methods are pure — they return a new Color.
 * The compiler resolves all color operations at build time.
 */
export interface Color {
  readonly _tag: 'Color';

  /** Increase lightness by the given ratio (0–1). */
  lighten(amount: number): Color;
  /** Decrease lightness by the given ratio (0–1). */
  darken(amount: number): Color;
  /** Set the alpha channel (0–1). */
  alpha(value: number): Color;
  /** Rotate the hue by degrees. */
  rotate(degrees: number): Color;
  /** Mix with another color. ratio=0 → this, ratio=1 → other. */
  mix(other: Color, ratio: number): Color;
  /**
   * Return black or white — whichever has sufficient contrast against this color.
   * Threshold defaults to WCAG AA (4.5).
   */
  contrast(threshold?: number): Color;
  /**
   * Adjust this color until it achieves the required contrast ratio
   * against the given foreground.
   */
  ensureContrast(foreground: Color, ratio: number): Color;
  /**
   * Produce a linear-gradient from this color to `to`.
   * @param to   The end stop color.
   * @param angle Gradient angle in degrees (default 180).
   */
  gradient(to: Color, angle?: number): Gradient;

  /** Serialize to a CSS color string. */
  toString(): string;
}

// ---------------------------------------------------------------------------
// Composite values
// ---------------------------------------------------------------------------

/**
 * A CSS linear-gradient value.
 * Produced by Color.gradient() or css.gradient().
 */
export interface Gradient {
  readonly _tag: 'Gradient';
  readonly stops: Array<[Color, number]>; // [color, position 0–100]
  readonly angle: number;

  toString(): string;
}

/**
 * A CSS border shorthand value.
 * Produced by css.border({ color, width, style }).
 */
export interface Border {
  readonly _tag: 'Border';
  readonly color: Color | undefined;
  readonly width: Length;
  readonly style: string; // 'solid' | 'dashed' | 'dotted' | 'none' | …

  toString(): string;
}

/**
 * A CSS box-shadow value.
 * Produced by css.shadow({ x, y, blur, spread, color, inset }).
 */
export interface Shadow {
  readonly _tag: 'Shadow';
  readonly x: Length;
  readonly y: Length;
  readonly blur: Length;
  readonly spread: Length;
  readonly color: Color;
  readonly inset: boolean;

  toString(): string;
}

/**
 * A CSS transform value.
 * Produced by css.transform({ translateX, scale, rotate, … }).
 * Multiple transforms compose via .compose().
 */
export interface Transform {
  readonly _tag: 'Transform';
  /** Ordered list of raw CSS transform function strings, e.g. ["translateX(10px)", "scale(1.1)"]. */
  readonly functions: ReadonlyArray<string>;

  /** Combine with another Transform, preserving order. */
  compose(other: Transform): Transform;

  toString(): string;
}

/**
 * A CSS transition shorthand value.
 * Produced by css.transition({ property: { duration, easing, delay } }).
 */
export interface Transition {
  readonly _tag: 'Transition';
  readonly entries: ReadonlyArray<TransitionEntry>;

  toString(): string;
}

export interface TransitionEntry {
  readonly property: string; // 'background' | 'transform' | 'all' | …
  readonly duration: Time;
  readonly easing?: string;  // 'ease' | 'ease-in' | 'linear' | cubic-bezier(…) | …
  readonly delay?: Time;
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

import type { FlexDescriptor, GridDescriptor, FlexOptions, GridOptions, FlexGridProperties } from './layout';
export type { FlexDescriptor, GridDescriptor, FlexOptions, GridOptions };
import type { PositioningProperties } from './positioning';
import type { SizingProperties } from './sizing';
import type { SpacingProperties } from './spacing';
import type { BorderProperties } from './borders';
import type { TypographyProperties } from './typography';
import type { CosmeticsProperties } from './cosmetics';
import type { EffectsProperties } from './effects';
import type { ScrollProperties } from './scroll';

// ---------------------------------------------------------------------------
// Style object
// ---------------------------------------------------------------------------

/**
 * The union of all values that can appear on the right-hand side of a style property.
 * Matches what the browser's CSSStyleDeclaration accepts plus our typed value objects.
 * The compiler strips the typed objects and replaces them with resolved CSS strings.
 */
/**
 * A responsive value wrapper allowing properties to vary by breakpoint.
 * At runtime, the serializer falls back to the 'base' property.
 * The Vite plugin extracts these into media query blocks at build time.
 */
export type ResponsiveValue<T> =
  | T
  | {
      base?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
      [breakpoint: string]: T | undefined;
    };

export type CSSValue =
  | string
  | number
  | Length
  | CalcExpression
  | ClampExpression
  | Time
  | Angle
  | Color
  | Gradient
  | Border
  | Shadow
  | Transform
  | Transition
  | ReadonlyArray<Length | CalcExpression | string | number>; // shorthand arrays e.g. padding: [v, h]

/**
 * A resolved style object compatible with the browser's `style` attribute.
 * All typed value objects have been serialized to strings.
 */
export type ResolvedStyle = Record<string, string>;

/**
 * A style object where values are typed Auwla CSS primitives.
 * This is what you write; the runtime and compiler both accept it.
 * Keys are camelCase CSS property names (same as React's CSSProperties).
 */

interface PropertyValueMap extends
  PositioningProperties,
  SizingProperties,
  SpacingProperties,
  BorderProperties,
  FlexGridProperties,
  TypographyProperties,
  CosmeticsProperties,
  EffectsProperties,
  ScrollProperties {
  // 10. Directives
  /**
   * CSS @import directive to import external stylesheets.
   * Resolved by the compiler and placed at the top of the global stylesheet.
   *
   * @example
   * '@import': 'url("https://fonts.googleapis.com/css2?family=Inter")'
   * '@import': ['url("first.css")', 'url("second.css")']
   */
  '@import'?: string | ReadonlyArray<string>;
}

type StyleObjectBase = Partial<{
  [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends Function
    ? never
    : K extends 'length' | 'parentRule'
    ? never
    : K]: ResponsiveValue<K extends keyof PropertyValueMap ? PropertyValueMap[K] : string | number>;
}>;

export interface StyleObject extends StyleObjectBase {
  [key: string]: any;
}
