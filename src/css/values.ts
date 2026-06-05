/**
 * @file values.ts
 * @description
 * Typed CSS composite value constructors: border, shadow, transform, transition,
 * grid layout, and flex layout.
 *
 * Each constructor returns a typed object that:
 *   1. Serializes to a valid CSS string via `.toString()`
 *   2. Can be inspected by the compiler for static extraction
 *   3. Carries enough information to reconstruct the value without re-parsing CSS strings
 */

import type {
  Angle,
  Border,
  CalcExpression,
  Color,
  FlexDescriptor,
  GridDescriptor,
  Length,
  Shadow,
  Time,
  Transform,
  Transition,
  TransitionEntry,
} from './types';
import { px } from './units';

// ---------------------------------------------------------------------------
// Border
// ---------------------------------------------------------------------------

export type BorderOptions = {
  /** Border color. Omit for `currentColor`. */
  color?: Color;
  /** Width in pixels or a Length value. Defaults to 1px. */
  width?: number | Length;
  /** CSS border-style keyword. Defaults to 'solid'. */
  style?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none' | 'hidden';
};

/**
 * Create a typed CSS border value.
 *
 * @example
 * css.border({ color: theme.colors.outline, width: 1 })
 * // → "1px solid #..."
 *
 * css.border.none()
 * // → "none"
 */
export function border(options: BorderOptions = {}): Border {
  const width: Length =
    typeof options.width === 'number'
      ? px(options.width)
      : (options.width ?? px(1));
  const style = options.style ?? 'solid';
  const color = options.color;

  return {
    _tag: 'Border',
    color,
    width,
    style,
    toString(): string {
      const parts = [width.toString(), style];
      if (color) parts.push(color.toString());
      return parts.join(' ');
    },
  };
}

/** Shorthand for `border({ style: 'none', width: 0 })`. */
border.none = function (): Border {
  return {
    _tag: 'Border',
    color: undefined,
    width: px(0),
    style: 'none',
    toString(): string {
      return 'none';
    },
  };
};

// ---------------------------------------------------------------------------
// Shadow
// ---------------------------------------------------------------------------

export type ShadowOptions = {
  x?: number | Length;
  y?: number | Length;
  blur?: number | Length;
  spread?: number | Length;
  color: Color;
  inset?: boolean;
};

function toLength(v: number | Length | undefined, fallback = 0): Length {
  if (v === undefined) return px(fallback);
  return typeof v === 'number' ? px(v) : v;
}

/**
 * Create a typed CSS box-shadow value.
 *
 * @example
 * css.shadow({ x: 0, y: 2, blur: 8, color: css.color.black.alpha(0.1) })
 * // → "0 2px 8px 0 oklch(...)"
 */
export function shadow(options: ShadowOptions): Shadow {
  const x = toLength(options.x);
  const y = toLength(options.y);
  const blur = toLength(options.blur);
  const spread = toLength(options.spread);
  const { color, inset = false } = options;

  return {
    _tag: 'Shadow',
    x,
    y,
    blur,
    spread,
    color,
    inset,
    toString(): string {
      const parts = [x.toString(), y.toString(), blur.toString(), spread.toString(), color.toString()];
      if (inset) parts.unshift('inset');
      return parts.join(' ');
    },
  };
}

/** Shorthand for an inset box-shadow. */
shadow.inset = function (options: Omit<ShadowOptions, 'inset'>): Shadow {
  return shadow({ ...options, inset: true });
};

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

export type TransformOptions = Partial<{
  translateX: Length | CalcExpression;
  translateY: Length | CalcExpression;
  translateZ: Length | CalcExpression;
  scale: number;
  scaleX: number;
  scaleY: number;
  rotate: Angle | number; // number is treated as degrees
  skewX: Angle | number;
  skewY: Angle | number;
}>;

/**
 * Create a typed CSS transform value.
 * Multiple properties become a space-separated list of transform functions.
 * Use `.compose()` to merge two Transform values.
 *
 * @example
 * css.transform({ translateX: css.px(10), scale: 1.1 })
 * // → "translateX(10px) scale(1.1)"
 */
export function transform(options: TransformOptions): Transform {
  const functions: string[] = [];

  if (options.translateX !== undefined)
    functions.push(`translateX(${options.translateX.toString()})`);
  if (options.translateY !== undefined)
    functions.push(`translateY(${options.translateY.toString()})`);
  if (options.translateZ !== undefined)
    functions.push(`translateZ(${options.translateZ.toString()})`);
  if (options.scale !== undefined)
    functions.push(`scale(${options.scale})`);
  if (options.scaleX !== undefined)
    functions.push(`scaleX(${options.scaleX})`);
  if (options.scaleY !== undefined)
    functions.push(`scaleY(${options.scaleY})`);
  if (options.rotate !== undefined) {
    const r = typeof options.rotate === 'number' ? `${options.rotate}deg` : options.rotate.toString();
    functions.push(`rotate(${r})`);
  }
  if (options.skewX !== undefined) {
    const s = typeof options.skewX === 'number' ? `${options.skewX}deg` : options.skewX.toString();
    functions.push(`skewX(${s})`);
  }
  if (options.skewY !== undefined) {
    const s = typeof options.skewY === 'number' ? `${options.skewY}deg` : options.skewY.toString();
    functions.push(`skewY(${s})`);
  }

  return makeTransform(functions);
}

function makeTransform(functions: string[]): Transform {
  return {
    _tag: 'Transform',
    functions,

    compose(other: Transform): Transform {
      return makeTransform([...functions, ...other.functions]);
    },

    toString(): string {
      return functions.length > 0 ? functions.join(' ') : 'none';
    },
  };
}

// ---------------------------------------------------------------------------
// Transition
// ---------------------------------------------------------------------------

export type TransitionMap = Record<
  string, // CSS property name, e.g. 'background', 'transform', 'all'
  {
    duration: Time;
    easing?: string;
    delay?: Time;
  }
>;

/**
 * Create a typed CSS transition value from a property → options map.
 *
 * @example
 * css.transition({
 *   background: { duration: css.ms(200) },
 *   transform:  { duration: css.ms(300), easing: css.ease('out') },
 * })
 * // → "background 200ms ease, transform 300ms ease-out"
 */
export function transition(map: TransitionMap): Transition {
  const entries: TransitionEntry[] = Object.entries(map).map(
    ([property, opts]) => ({
      property,
      duration: opts.duration,
      easing: opts.easing,
      delay: opts.delay,
    }),
  );

  return {
    _tag: 'Transition',
    entries,
    toString(): string {
      return entries
        .map((e) => {
          const parts = [e.property, e.duration.toString()];
          if (e.easing) parts.push(e.easing);
          if (e.delay) parts.push(e.delay.toString());
          return parts.join(' ');
        })
        .join(', ');
    },
  };
}

/**
 * Map easing shorthand names to CSS cubic-bezier / keyword values.
 *
 * @example
 * css.ease('out')   // → "ease-out"
 * css.ease('spring') // → "cubic-bezier(0.34, 1.56, 0.64, 1)"
 */
export function ease(
  name: 'in' | 'out' | 'in-out' | 'linear' | 'spring' | 'bounce',
): string {
  const map: Record<string, string> = {
    in:       'ease-in',
    out:      'ease-out',
    'in-out': 'ease-in-out',
    linear:   'linear',
    spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce:   'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };
  return map[name] ?? 'ease';
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export type GridOptions = {
  columns?: Array<Length | CalcExpression | 'auto'>;
  rows?: Array<Length | CalcExpression | 'auto'>;
  areas?: Array<Array<string>>;
  gap?: Length;
  columnGap?: Length;
  rowGap?: Length;
};

/**
 * Create a typed CSS grid descriptor.
 * Call `.toProperties()` to get a `Record<string, string>` to spread into a style object.
 *
 * @example
 * css.grid({
 *   columns: [css.fr(1), css.px(300)],
 *   rows:    [css.auto(), css.fr(1)],
 *   gap:     css.px(16),
 * }).toProperties()
 * // → { display: 'grid', gridTemplateColumns: '1fr 300px', … }
 */
export function grid(options: GridOptions): GridDescriptor {
  return {
    _tag: 'Grid',
    columns: options.columns ?? [],
    rows: options.rows ?? [],
    areas: options.areas,
    gap: options.gap,
    columnGap: options.columnGap,
    rowGap: options.rowGap,

    toProperties(): Record<string, string> {
      const props: Record<string, string> = { display: 'grid' };

      if (this.columns.length > 0)
        props['gridTemplateColumns'] = this.columns.map(String).join(' ');
      if (this.rows.length > 0)
        props['gridTemplateRows'] = this.rows.map(String).join(' ');
      if (this.areas)
        props['gridTemplateAreas'] = this.areas
          .map((row) => `"${row.join(' ')}"`)
          .join(' ');
      if (this.gap)
        props['gap'] = this.gap.toString();
      if (this.columnGap)
        props['columnGap'] = this.columnGap.toString();
      if (this.rowGap)
        props['rowGap'] = this.rowGap.toString();

      return props;
    },
  };
}

// ---------------------------------------------------------------------------
// Flex
// ---------------------------------------------------------------------------

export type FlexOptions = {
  direction?: FlexDescriptor['direction'];
  wrap?: boolean | 'reverse';
  gap?: Length;
  align?: string;
  justify?: string;
};

/**
 * Create a typed CSS flex descriptor.
 * Call `.toProperties()` to get a `Record<string, string>` to spread into a style object.
 *
 * @example
 * css.flex({ direction: 'row', gap: theme.spacing.md, align: 'center' }).toProperties()
 * // → { display: 'flex', flexDirection: 'row', gap: '…', alignItems: 'center' }
 */
export function flex(options: FlexOptions): FlexDescriptor {
  return {
    _tag: 'Flex',
    direction: options.direction,
    wrap: options.wrap,
    gap: options.gap,
    align: options.align,
    justify: options.justify,

    toProperties(): Record<string, string> {
      const props: Record<string, string> = { display: 'flex' };

      if (this.direction) props['flexDirection'] = this.direction;

      if (this.wrap !== undefined) {
        if (this.wrap === true) props['flexWrap'] = 'wrap';
        else if (this.wrap === 'reverse') props['flexWrap'] = 'wrap-reverse';
        else props['flexWrap'] = 'nowrap';
      }

      if (this.gap) props['gap'] = this.gap.toString();
      if (this.align) props['alignItems'] = this.align;
      if (this.justify) props['justifyContent'] = this.justify;

      return props;
    },
  };
}

// ---------------------------------------------------------------------------
// Outline (used in focus rings)
// ---------------------------------------------------------------------------

export type OutlineOptions = {
  color: Color;
  width?: number | Length;
  style?: 'solid' | 'dashed' | 'dotted' | 'auto';
  offset?: number | Length;
};

/**
 * Create a typed CSS outline value.
 * Returns a plain string because `outline` is a single CSS shorthand.
 * `offset` is emitted as a separate `outlineOffset` property — callers must
 * spread both into the style object.
 *
 * @example
 * css.outline({ color: theme.colors.focus, width: 2, offset: 2 })
 * // → "2px solid #..."
 */
export function outline(options: OutlineOptions): { outline: string; outlineOffset?: string; toString(): string } {
  const width = toLength(options.width, 1);
  const style = options.style ?? 'solid';
  
  return {
    outline: `${width.toString()} ${style} ${options.color.toString()}`,
    outlineOffset: options.offset !== undefined ? toLength(options.offset).toString() : undefined,
    toString() {
      return this.outline;
    }
  };
}
