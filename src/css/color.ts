/**
 * @file color.ts
 * @description
 * Typed CSS color value with pure manipulation methods.
 *
 * Internally colors are stored in OKLCH — a perceptually uniform color space
 * that makes lighten/darken/rotate behave consistently across hues.
 * The compiler resolves all operations at build time and emits hex or oklch strings.
 *
 * External inputs (hex, rgb, hsl, oklch strings) are parsed on construction.
 * All manipulation methods are pure — they return a new Color.
 */

import type { Color, Gradient } from './types';

// ---------------------------------------------------------------------------
// Internal: OKLCH representation
// ---------------------------------------------------------------------------

/**
 * Internal color state. All channels normalized:
 *   L  — lightness  0–1
 *   C  — chroma     0–0.4 (typical range; no hard cap)
 *   H  — hue        0–360
 *   A  — alpha      0–1
 */
interface OklchChannels {
  L: number;
  C: number;
  H: number;
  A: number;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Parse a hex color string (#rgb, #rrggbb, #rrggbbaa) to sRGB [0–1]. */
function parseHex(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');

  if (h.length === 3 || h.length === 4) {
    const r = parseInt(h[0]! + h[0]!, 16) / 255;
    const g = parseInt(h[1]! + h[1]!, 16) / 255;
    const b = parseInt(h[2]! + h[2]!, 16) / 255;
    const a = h.length === 4 ? parseInt(h[3]! + h[3]!, 16) / 255 : 1;
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a))
      throw new Error(`css.color: invalid hex characters in "${hex}"`);
    return [r, g, b, a];
  }

  if (h.length === 6 || h.length === 8) {
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a))
      throw new Error(`css.color: invalid hex characters in "${hex}"`);
    return [r, g, b, a];
  }

  throw new Error(`css.color: cannot parse hex "${hex}"`);
}

// ---------------------------------------------------------------------------
// Color space conversions: sRGB ↔ Linear ↔ XYZ-D65 ↔ Oklab ↔ OKLCH
// These are the standard formulas from the CSS Color Level 4 spec.
// ---------------------------------------------------------------------------

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function gammaEncode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // sRGB linear → LMS (Bradford-adapted)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

function oklabToSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bv = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [
    Math.max(0, Math.min(1, gammaEncode(r))),
    Math.max(0, Math.min(1, gammaEncode(g))),
    Math.max(0, Math.min(1, gammaEncode(bv))),
  ];
}

function oklabToOklch(L: number, a: number, b: number): OklchChannels {
  const C = Math.sqrt(a * a + b * b);
  const H = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C, H: H < 0 ? H + 360 : H, A: 1 };
}

function oklchToOklab(ch: OklchChannels): [number, number, number] {
  const hRad = (ch.H * Math.PI) / 180;
  return [ch.L, ch.C * Math.cos(hRad), ch.C * Math.sin(hRad)];
}

// ---------------------------------------------------------------------------
// Parsing: convert any supported CSS color string → OklchChannels
// ---------------------------------------------------------------------------

function parseColor(input: string): OklchChannels {
  const s = input.trim();

  // --- hex ---
  if (s.startsWith('#')) {
    const [r, g, b, a] = parseHex(s);
    const [L, ab, bb] = srgbToOklab(r, g, b);
    const ch = oklabToOklch(L, ab, bb);
    ch.A = a;
    return ch;
  }

  // --- oklch(L C H) or oklch(L C H / A) ---
  const oklchMatch = s.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/i,
  );
  if (oklchMatch) {
    const rawL = oklchMatch[1]!;
    const L = rawL.endsWith('%') ? parseFloat(rawL) / 100 : parseFloat(rawL);
    const C = parseFloat(oklchMatch[2]!);
    const H = parseFloat(oklchMatch[3]!);
    const rawA = oklchMatch[4];
    const A = rawA
      ? rawA.endsWith('%')
        ? parseFloat(rawA) / 100
        : parseFloat(rawA)
      : 1;
    return { L, C, H, A };
  }

  // --- rgb(r g b) or rgb(r, g, b) with optional alpha ---
  const rgbMatch = s.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (rgbMatch) {
    const r = parseFloat(rgbMatch[1]!) / 255;
    const g = parseFloat(rgbMatch[2]!) / 255;
    const b = parseFloat(rgbMatch[3]!) / 255;
    const rawA = rgbMatch[4];
    const A = rawA
      ? rawA.endsWith('%')
        ? parseFloat(rawA) / 100
        : parseFloat(rawA)
      : 1;
    const [L, ab, bb] = srgbToOklab(r, g, b);
    const ch = oklabToOklch(L, ab, bb);
    ch.A = A;
    return ch;
  }

  throw new Error(`css.color: unsupported format "${input}". Use hex, rgb(), or oklch().`);
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** Clamp a number to [min, max]. */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Serialize OklchChannels to a CSS color string.
 * Outputs hex when alpha=1 for maximum compatibility; oklch otherwise.
 */
function serializeColor(ch: OklchChannels): string {
  const [r, g, b] = oklabToSrgb(...oklchToOklab(ch));

  if (ch.A === 1) {
    const hex = (v: number) =>
      Math.round(clamp(v, 0, 1) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  // Use oklch for colors with transparency — preserves the perceptual intent
  return `oklch(${ch.L.toFixed(4)} ${ch.C.toFixed(4)} ${ch.H.toFixed(2)} / ${ch.A.toFixed(3)})`;
}

// ---------------------------------------------------------------------------
// WCAG relative luminance & contrast ratio
// ---------------------------------------------------------------------------

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Color factory
// ---------------------------------------------------------------------------

function makeColor(channels: OklchChannels): Color {
  const self: Color = {
    _tag: 'Color',

    lighten(amount: number): Color {
      return makeColor({ ...channels, L: clamp(channels.L + amount, 0, 1) });
    },

    darken(amount: number): Color {
      return makeColor({ ...channels, L: clamp(channels.L - amount, 0, 1) });
    },

    alpha(value: number): Color {
      return makeColor({ ...channels, A: clamp(value, 0, 1) });
    },

    rotate(degrees: number): Color {
      return makeColor({ ...channels, H: ((channels.H + degrees) % 360 + 360) % 360 });
    },

    mix(other: Color, ratio: number): Color {
      // Parse `other` back to channels by round-tripping through its string repr
      const otherCh = parseColor(other.toString());
      const r = clamp(ratio, 0, 1);

      // Circular hue interpolation so that 350° and 10° mix toward 0°,
      // not toward the long-path 180°.
      let h1 = channels.H;
      let h2 = otherCh.H;
      const delta = h2 - h1;
      if (delta > 180) {
        h1 += 360;
      } else if (delta < -180) {
        h2 += 360;
      }
      const H = ((h1 * (1 - r) + h2 * r) % 360 + 360) % 360;

      return makeColor({
        L: channels.L * (1 - r) + otherCh.L * r,
        C: channels.C * (1 - r) + otherCh.C * r,
        H,
        A: channels.A * (1 - r) + otherCh.A * r,
      });
    },

    contrast(threshold = 4.5): Color {
      const [r, g, b] = oklabToSrgb(...oklchToOklab(channels));
      const lum = relativeLuminance(r, g, b);
      const whiteLum = 1;
      const blackLum = 0;
      const whiteContrast = contrastRatio(lum, whiteLum);
      const blackContrast = contrastRatio(lum, blackLum);
      // Pick whichever passes the threshold; fallback to higher contrast
      if (whiteContrast >= threshold) return makeColor(parseColor('#ffffff'));
      if (blackContrast >= threshold) return makeColor(parseColor('#000000'));
      return whiteContrast > blackContrast
        ? makeColor(parseColor('#ffffff'))
        : makeColor(parseColor('#000000'));
    },

    ensureContrast(foreground: Color, ratio: number): Color {
      // Binary search in lightness until the contrast ratio is met.
      // We target ratio * 1.02 to leave a small safety margin for
      // 8-bit hex quantization: the exact OKLCH boundary may round to
      // a hex value whose contrast is fractionally below the threshold.
      const targetRatio = ratio * 1.02;
      const fgCh = parseColor(foreground.toString());
      const [fr, fg, fb] = oklabToSrgb(...oklchToOklab(fgCh));
      const fgLum = relativeLuminance(fr, fg, fb);

      let lo = 0;
      let hi = 1;
      let best: OklchChannels = channels;

      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const candidate: OklchChannels = { ...channels, L: mid };
        const [cr, cg, cb] = oklabToSrgb(...oklchToOklab(candidate));
        const candLum = relativeLuminance(cr, cg, cb);
        const cr_ = contrastRatio(candLum, fgLum);

        if (cr_ >= targetRatio) {
          best = candidate;
          // Contrast met — try to get closer to original lightness
          if (channels.L > 0.5) lo = mid; // light original → try lighter (upper half)
          else hi = mid;                  // dark original  → try darker  (lower half)
        } else {
          // Contrast NOT met — move away from original lightness
          if (channels.L > 0.5) hi = mid; // light original → go darker (lower half)
          else lo = mid;                  // dark original  → go lighter (upper half)
        }
      }

      return makeColor(best);
    },

    gradient(to: Color, angle = 180): Gradient {
      return {
        _tag: 'Gradient',
        stops: [
          [self, 0],
          [to, 100],
        ],
        angle,
        toString(): string {
          const stops = this.stops
            .map(([c, pos]) => `${c.toString()} ${pos}%`)
            .join(', ');
          return `linear-gradient(${angle}deg, ${stops})`;
        },
      };
    },

    toString(): string {
      return serializeColor(channels);
    },
  };

  return self;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a typed Color from any supported CSS color string.
 * Supported: hex (#rgb, #rrggbb, #rrggbbaa), rgb/rgba(), oklch().
 *
 * @example
 * css.color('#3b82f6')
 * css.color('oklch(0.6 0.2 220)')
 * css.color('rgb(59, 130, 246)')
 */
export function color(input: string): Color {
  return makeColor(parseColor(input));
}

// Convenience static colors — avoids repeatedly parsing the same strings
color.black = makeColor(parseColor('#000000'));
color.white = makeColor(parseColor('#ffffff'));
color.transparent = makeColor({ L: 0, C: 0, H: 0, A: 0 });

/**
 * Create a typed color scale (map of keys → Color).
 *
 * The first argument is the "seed" (reference) color for the scale — it acts
 * as documentation and a compiler hint for future palette generation.
 * The second argument defines the actual step values.
 *
 * @example
 * css.color.scale('#3b82f6', {
 *   50:  '#eff6ff',
 *   100: '#dbeafe',
 *   500: '#3b82f6',
 *   900: '#1e3a5f',
 * })
 * // Returns { 50: Color, 100: Color, 500: Color, 900: Color }
 */
color.scale = function colorScale<K extends string | number>(
  _seed: string,
  steps: Record<K, string | Color>,
): { [P in K]: Color } {
  const result = {} as Record<string | number, Color>;
  for (const [key, value] of Object.entries(steps)) {
    result[key] = typeof value === 'string' ? makeColor(parseColor(value)) : (value as Color);
  }
  return result as { [P in K]: Color };
};

/**
 * Manipulation string — describes a color transform relative to a base color.
 * Applied by color.group() to derive interactive state colors.
 */
type ColorManipulation = `lighten(${number})` | `darken(${number})` | `alpha(${number})` | `rotate(${number})`;

/**
 * Parse and apply a manipulation string to a base Color.
 * Used internally by color.group().
 */
function applyManipulation(base: Color, manip: Color | ColorManipulation | string): Color {
  if (typeof manip !== 'string') return manip;
  const m = manip.match(/^(\w+)\(([^)]+)\)$/);
  if (!m) throw new Error(`css.color.group: invalid manipulation "${manip}". Use "lighten(n)", "darken(n)", "alpha(n)", or "rotate(n)".`);
  const fn  = m[1]!;
  const val = parseFloat(m[2]!);
  if (isNaN(val)) throw new Error(`css.color.group: non-numeric argument in "${manip}".`);
  switch (fn) {
    case 'lighten': return base.lighten(val);
    case 'darken':  return base.darken(val);
    case 'alpha':   return base.alpha(val);
    case 'rotate':  return base.rotate(val);
    default: throw new Error(`css.color.group: unknown function "${fn}". Use lighten, darken, alpha, or rotate.`);
  }
}

/**
 * The interactive color group returned by color.group().
 * Contains one Color for each interactive state.
 */
export interface ColorGroup {
  /** The resting, default color. */
  base:     Color;
  /** Color when the element is hovered. */
  hover:    Color;
  /** Color when the element is actively pressed. */
  active:   Color;
  /** Color when the element is disabled. */
  disabled: Color;
}

/**
 * Create a set of interactive state colors derived from a single base color.
 *
 * Each state can be:
 *   - A Color object — used as-is
 *   - A manipulation string — applied to the base color:
 *       "lighten(0.1)" | "darken(0.1)" | "alpha(0.3)" | "rotate(30)"
 *
 * If a state is omitted, sensible defaults are applied:
 *   hover    → base.lighten(0.08)
 *   active   → base.darken(0.08)
 *   disabled → base.alpha(0.35)
 *
 * @example
 * css.color.group({
 *   base:     theme.colors.primary[500],
 *   hover:    'lighten(0.08)',
 *   active:   'darken(0.08)',
 *   disabled: 'alpha(0.35)',
 * })
 */
color.group = function colorGroup(options: {
  base:      Color;
  hover?:    Color | ColorManipulation | string;
  active?:   Color | ColorManipulation | string;
  disabled?: Color | ColorManipulation | string;
}): ColorGroup {
  const { base, hover, active, disabled } = options;
  return {
    base,
    hover:    hover    != null ? applyManipulation(base, hover)    : base.lighten(0.08),
    active:   active   != null ? applyManipulation(base, active)   : base.darken(0.08),
    disabled: disabled != null ? applyManipulation(base, disabled) : base.alpha(0.35),
  };
};

/**
 * The full 11-step color palette generated by color.palette().
 */
export interface ColorPalette {
  50:  Color;
  100: Color;
  200: Color;
  300: Color;
  400: Color;
  500: Color;
  600: Color;
  700: Color;
  800: Color;
  900: Color;
  950: Color;
  [key: string]: Color;
}

/**
 * Generate a complete 11-step shade scale (50-950) dynamically from a single seed color.
 * Uses OKLCH interpolation curves to keep hues consistent and saturation balanced.
 *
 * @example
 * const palette = css.color.palette('#3b82f6')
 * // Returns { 50: Color, 100: Color, ..., 950: Color }
 */
color.palette = function colorPalette(seed: string | Color): ColorPalette {
  const baseColor = typeof seed === 'string' ? color(seed) : seed;
  const channels = parseColor(baseColor.toString());

  const L_s = channels.L;
  const C_s = channels.C;
  const H_s = channels.H;

  // Lighter anchor at step 0 (hypothetical white-ish end)
  const L_light = 0.98;
  const C_light = Math.min(0.015, C_s * 0.15);

  // Darker anchor at step 1000 (hypothetical deep-ish end)
  const L_dark = 0.12;
  const C_dark = Math.min(0.04, C_s * 0.35);

  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
  const result = {} as Record<number, Color>;

  for (const step of steps) {
    if (step === 500) {
      result[step] = baseColor;
      continue;
    }

    let L: number;
    let C: number;

    if (step < 500) {
      // Fraction from 0 (step 0) to 1 (step 500)
      const f = step / 500;
      // Exponential curve for smoother light steps (power of 1.1)
      const weight = Math.pow(1 - f, 1.1);
      L = L_s + (L_light - L_s) * weight;
      C = C_s + (C_light - C_s) * weight;
    } else {
      // Fraction from 0 (step 500) to 1 (step 1000)
      // For step 950, f_dark = (950 - 500) / 500 = 0.9
      const f_dark = (step - 500) / 500;
      L = L_s - (L_s - L_dark) * f_dark;
      C = C_s - (C_s - C_dark) * f_dark;
    }

    result[step] = makeColor({
      L: Math.max(0.01, Math.min(0.99, L)),
      C: Math.max(0, C),
      H: H_s,
      A: 1,
    });
  }

  return result as unknown as ColorPalette;
};

/**
 * Build a complex multi-stop gradient.
 *
 * @example
 * css.gradient({
 *   angle: 135,
 *   stops: [
 *     [blue, 0],
 *     [blue.alpha(0.5), 50],
 *     [blue.lighten(0.3), 100],
 *   ],
 * })
 */
export function gradient(options: {
  angle: number;
  stops: Array<[Color, number]>;
}): Gradient {
  return {
    _tag: 'Gradient',
    stops: options.stops,
    angle: options.angle,
    toString(): string {
      const stops = this.stops
        .map(([c, pos]) => `${c.toString()} ${pos}%`)
        .join(', ');
      return `linear-gradient(${this.angle}deg, ${stops})`;
    },
  };
}
