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

/**
 * A CSS grid shorthand descriptor.
 * Produced by css.grid({ columns, rows, areas, gap }).
 */
export interface GridDescriptor {
  readonly _tag: 'Grid';
  readonly columns: ReadonlyArray<Length | CalcExpression | 'auto'>;
  readonly rows: ReadonlyArray<Length | CalcExpression | 'auto'>;
  readonly areas?: ReadonlyArray<ReadonlyArray<string>>;
  readonly gap?: Length;
  readonly columnGap?: Length;
  readonly rowGap?: Length;

  /** Serialize to an object of CSS properties. */
  toProperties(): Record<string, string>;
}

/**
 * A CSS flex shorthand descriptor.
 * Produced by css.flex({ direction, wrap, gap, align, justify }).
 */
export interface FlexDescriptor {
  readonly _tag: 'Flex';
  readonly direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  readonly wrap?: boolean | 'reverse';
  readonly gap?: Length;
  readonly align?: string;   // 'center' | 'flex-start' | 'stretch' | …
  readonly justify?: string; // 'center' | 'space-between' | 'flex-end' | …

  /** Serialize to an object of CSS properties. */
  toProperties(): Record<string, string>;
}

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
type LengthProperty =
  | Length
  | CalcExpression
  | ClampExpression
  | string
  | number
  | ReadonlyArray<Length | CalcExpression | string | number>;

type ColorProperty = Color | string;

interface PropertyValueMap {
  // 1. Layout & Positioning
  bottom?: LengthProperty;
  /**
   * Layout display mode.
   *
   * @example
   * display: 'block'
   * display: flex({ direction: 'row', align: 'center', gap: px(16) })
   * display: grid({ columns: [fr(1), px(200)], gap: px(12) })
   */
  display?: string;
  inset?: LengthProperty;
  left?: LengthProperty;
  position?: string;
  right?: LengthProperty;
  top?: LengthProperty;
  zIndex?: number | string;

  // 2. Box Model (Sizing, Margins, Padding)
  gap?: LengthProperty;
  height?: LengthProperty;
  /**
   * Margin spacing shorthand.
   *
   * @example
   * margin: px(8)
   * margin: [px(4), zero()]
   */
  margin?: LengthProperty;
  marginBottom?: LengthProperty;
  marginLeft?: LengthProperty;
  marginRight?: LengthProperty;
  marginTop?: LengthProperty;
  maxHeight?: LengthProperty;
  maxWidth?: LengthProperty;
  minHeight?: LengthProperty;
  minWidth?: LengthProperty;
  /**
   * Padding spacing shorthand.
   * Accepts length primitives, custom units, or arrays for multi-side shorthand.
   *
   * @example
   * padding: px(16)            // "16px" on all sides
   * padding: [px(8), px(16)]    // "8px" vertical, "16px" horizontal
   */
  padding?: LengthProperty;
  paddingBottom?: LengthProperty;
  paddingLeft?: LengthProperty;
  paddingRight?: LengthProperty;
  paddingTop?: LengthProperty;
  width?: LengthProperty;

  // 3. Flexbox & Grid
  alignContent?: string;
  alignItems?: string;
  alignSelf?: string;
  columnGap?: LengthProperty;
  flex?: FlexDescriptor | string;
  flexBasis?: LengthProperty;
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse' | string;
  flexGrow?: number | string;
  flexShrink?: number | string;
  flexWrap?: 'wrap' | 'wrap-reverse' | 'nowrap' | string;
  grid?: GridDescriptor | string;
  gridArea?: string;
  gridAutoColumns?: string;
  gridAutoFlow?: string;
  gridAutoRows?: string;
  gridColumn?: string;
  gridColumnEnd?: string;
  gridColumnStart?: string;
  gridRow?: string;
  gridRowEnd?: string;
  gridRowStart?: string;
  gridTemplateAreas?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  justifyContent?: string;
  justifyItems?: string;
  justifySelf?: string;
  rowGap?: LengthProperty;

  // 4. Typography
  fontFamily?: string;
  fontSize?: LengthProperty;
  fontStyle?: string;
  fontWeight?: number | string;
  letterSpacing?: LengthProperty;
  lineHeight?: LengthProperty;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  wordSpacing?: LengthProperty;

  // 5. Borders & Corners
  /**
   * Border shorthand.
   *
   * @example
   * border: border({ color: color('#e5e7eb'), width: 1, style: 'solid' })
   * border: border.none()
   */
  border?: Border | string;
  borderBottom?: Border | string;
  borderBottomColor?: ColorProperty;
  borderBottomLeftRadius?: LengthProperty;
  borderBottomRightRadius?: LengthProperty;
  borderBottomStyle?: string;
  borderBottomWidth?: LengthProperty;
  borderColor?: ColorProperty;
  borderLeft?: Border | string;
  borderLeftColor?: ColorProperty;
  borderLeftStyle?: string;
  borderLeftWidth?: LengthProperty;
  borderRadius?: LengthProperty;
  borderRight?: Border | string;
  borderRightColor?: ColorProperty;
  borderRightStyle?: string;
  borderRightWidth?: LengthProperty;
  borderStyle?: string;
  borderTop?: Border | string;
  borderTopColor?: ColorProperty;
  borderTopLeftRadius?: LengthProperty;
  borderTopRightRadius?: LengthProperty;
  borderTopStyle?: string;
  borderTopWidth?: LengthProperty;
  borderWidth?: LengthProperty;

  // 6. Outlines
  /**
   * Outline cosmetics (useful for focus rings).
   *
   * @example
   * outline: outline({ color: color('#3b82f6'), width: 2, offset: 2 })
   */
  outline?: { outline: string; outlineOffset?: string; toString(): string } | Border | string;
  outlineColor?: ColorProperty;
  outlineOffset?: LengthProperty;
  outlineStyle?: string;
  outlineWidth?: LengthProperty;

  // 7. Backgrounds & Colors (Cosmetics)
  /**
   * Background value.
   * Accepts Color objects, Gradients, or CSS color/image strings.
   *
   * @example
   * background: color('#ffffff')
   * background: gradient({ angle: 90, stops: [[color('#00f'), 0], [color('#f00'), 100]] })
   */
  background?: Color | Gradient | string;
  backgroundColor?: ColorProperty;
  /**
   * Text foreground color.
   * Accepts Color objects or CSS color strings.
   *
   * @example
   * color: color('#3b82f6')
   * color: color('#3b82f6').lighten(0.1)
   * color: 'inherit'
   */
  color?: ColorProperty;
  fill?: ColorProperty;
  opacity?: number | string;
  stroke?: ColorProperty;

  // 8. Shadows
  /**
   * Shadow cosmetics.
   *
   * @example
   * boxShadow: shadow({ x: 0, y: 4, blur: 8, color: color('#000').alpha(0.1) })
   * boxShadow: shadow.inset({ x: 0, y: 1, blur: 3, color: color('#000').alpha(0.06) })
   */
  boxShadow?: Shadow | string;
  textShadow?: Shadow | string;

  // 9. Transforms, Transitions & Animations
  animationDelay?: Time | string | number;
  animationDuration?: Time | string | number;
  /**
   * CSS transformations.
   *
   * @example
   * transform: transform({ translateX: px(10), scale: 1.1 })
   */
  transform?: Transform | string;
  /**
   * CSS transition timings.
   *
   * @example
   * transition: transition({
   *   background: { duration: ms(200) },
   *   transform:  { duration: ms(300), easing: ease('out') }
   * })
   */
  transition?: Transition | string;
  transitionDelay?: Time | string | number;
  transitionDuration?: Time | string | number;

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

export type StyleObject = Partial<{
  [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends Function
    ? never
    : K extends 'length' | 'parentRule'
    ? never
    : K]: ResponsiveValue<K extends keyof PropertyValueMap ? PropertyValueMap[K] : string | number>;
}>;
