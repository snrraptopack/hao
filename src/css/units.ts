/**
 * @file units.ts
 * @description
 * Typed CSS length, time, and angle value primitives.
 *
 * Why objects instead of strings?
 * - Arithmetic is safe: `css.px(8).multiply(2)` → 16px, not "8px2"
 * - Mixed-unit math automatically becomes a calc() expression
 * - The compiler can evaluate these at build time and emit plain strings
 * - TypeScript catches unit mismatches before the browser does
 */

import type {
  Angle,
  AngleUnit,
  CalcExpression,
  ClampExpression,
  Length,
  LengthUnit,
  Time,
  TimeUnit,
} from './types';

// ---------------------------------------------------------------------------
// Internal: Length implementation
// ---------------------------------------------------------------------------

/**
 * Serialize a LengthUnit to its CSS string counterpart.
 * 'pct' is stored internally to avoid the '%' character in identifiers.
 */
function unitString(unit: LengthUnit): string {
  return unit === 'pct' ? '%' : unit;
}

/**
 * Create a CalcExpression from a raw CSS calc() string.
 * Used when arithmetic mixes incompatible units.
 */
function makeCalc(expression: string): CalcExpression {
  return {
    _tag: 'Calc',
    expression,
    toString() {
      return `calc(${this.expression})`;
    },
  };
}

/**
 * Create a typed Length value.
 * All arithmetic methods are pure — they return a new Length or CalcExpression.
 */
function makeLength(value: number, unit: LengthUnit): Length {
  const self: Length = {
    _tag: 'Length',
    value,
    unit,

    add(other: Length): Length | CalcExpression {
      if (other.unit === unit) return makeLength(value + other.value, unit);
      return makeCalc(`${self.toString()} + ${other.toString()}`);
    },

    subtract(other: Length): Length | CalcExpression {
      if (other.unit === unit) return makeLength(value - other.value, unit);
      return makeCalc(`${self.toString()} - ${other.toString()}`);
    },

    multiply(factor: number): Length {
      return makeLength(value * factor, unit);
    },

    divide(divisor: number): Length {
      if (divisor === 0) throw new RangeError('css length: division by zero');
      return makeLength(value / divisor, unit);
    },

    toString(): string {
      // Special-case zero: CSS allows bare 0 with no unit for lengths
      if (value === 0 && unit !== 'fr') return '0';
      return `${value}${unitString(unit)}`;
    },
  };

  return self;
}

// ---------------------------------------------------------------------------
// Internal: Time implementation
// ---------------------------------------------------------------------------

function makeTime(value: number, unit: TimeUnit): Time {
  return {
    _tag: 'Time',
    value,
    unit,

    add(other: Time): Time {
      // Normalize both to ms before adding, then return in the original unit
      const msA = unit === 's' ? value * 1000 : value;
      const msB = other.unit === 's' ? other.value * 1000 : other.value;
      const totalMs = msA + msB;
      return unit === 's' ? makeTime(totalMs / 1000, 's') : makeTime(totalMs, 'ms');
    },

    multiply(factor: number): Time {
      return makeTime(value * factor, unit);
    },

    toString(): string {
      return `${value}${unit}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Internal: Angle implementation
// ---------------------------------------------------------------------------

function makeAngle(value: number, unit: AngleUnit): Angle {
  return {
    _tag: 'Angle',
    value,
    unit,

    add(other: Angle): Angle {
      const degA = unit === 'rad' ? (value * 180) / Math.PI : unit === 'turn' ? value * 360 : value;
      const degB = other.unit === 'rad' ? (other.value * 180) / Math.PI : other.unit === 'turn' ? other.value * 360 : other.value;
      const totalDeg = degA + degB;
      
      if (unit === 'rad') return makeAngle((totalDeg * Math.PI) / 180, 'rad');
      if (unit === 'turn') return makeAngle(totalDeg / 360, 'turn');
      return makeAngle(totalDeg, 'deg');
    },

    subtract(other: Angle): Angle {
      const degA = unit === 'rad' ? (value * 180) / Math.PI : unit === 'turn' ? value * 360 : value;
      const degB = other.unit === 'rad' ? (other.value * 180) / Math.PI : other.unit === 'turn' ? other.value * 360 : other.value;
      const totalDeg = degA - degB;
      
      if (unit === 'rad') return makeAngle((totalDeg * Math.PI) / 180, 'rad');
      if (unit === 'turn') return makeAngle(totalDeg / 360, 'turn');
      return makeAngle(totalDeg, 'deg');
    },

    multiply(factor: number): Angle {
      return makeAngle(value * factor, unit);
    },

    divide(divisor: number): Angle {
      if (divisor === 0) throw new RangeError('css angle: division by zero');
      return makeAngle(value / divisor, unit);
    },

    toString(): string {
      return `${value}${unit}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Internal: ClampExpression implementation
// ---------------------------------------------------------------------------

function makeClamp(
  min: Length | CalcExpression,
  preferred: Length | CalcExpression,
  max: Length | CalcExpression,
): ClampExpression {
  return {
    _tag: 'Clamp',
    min,
    preferred,
    max,
    toString(): string {
      return `clamp(${min.toString()}, ${preferred.toString()}, ${max.toString()})`;
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** `16` → Length{ 16, 'px' }  →  "16px" */
export function px(value: number): Length {
  return makeLength(value, 'px');
}

/** `1.5` → Length{ 1.5, 'rem' }  →  "1.5rem" */
export function rem(value: number): Length {
  return makeLength(value, 'rem');
}

/** `1` → Length{ 1, 'em' }  →  "1em" */
export function em(value: number): Length {
  return makeLength(value, 'em');
}

/** `50` → Length{ 50, 'vw' }  →  "50vw" */
export function vw(value: number): Length {
  return makeLength(value, 'vw');
}

/** `100` → Length{ 100, 'vh' }  →  "100vh" */
export function vh(value: number): Length {
  return makeLength(value, 'vh');
}

/** `100` → Length{ 100, 'vmin' }  →  "100vmin" */
export function vmin(value: number): Length {
  return makeLength(value, 'vmin');
}

/** `100` → Length{ 100, 'vmax' }  →  "100vmax" */
export function vmax(value: number): Length {
  return makeLength(value, 'vmax');
}

/** `50` → Length{ 50, 'pct' }  →  "50%" */
export function pct(value: number): Length {
  return makeLength(value, 'pct');
}

/** `1` → Length{ 1, 'fr' }  →  "1fr" — grid fraction unit */
export function fr(value: number): Length {
  return makeLength(value, 'fr');
}

/** `1` → Length{ 1, 'ch' }  →  "1ch" — character-width unit */
export function ch(value: number): Length {
  return makeLength(value, 'ch');
}

/** A Length of exactly zero. No unit is emitted (valid CSS). */
export function zero(): Length {
  return makeLength(0, 'px');
}

/**
 * CSS clamp() — constrains a value between a minimum and maximum.
 *
 * @example
 * css.clamp(css.rem(1), css.vw(4), css.px(64))
 * // → "clamp(1rem, 4vw, 64px)"
 */
export function clamp(
  min: Length | CalcExpression,
  preferred: Length | CalcExpression,
  max: Length | CalcExpression,
): ClampExpression {
  return makeClamp(min, preferred, max);
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** `200` → Time{ 200, 'ms' }  →  "200ms" */
export function ms(value: number): Time {
  return makeTime(value, 'ms');
}

/** `0.3` → Time{ 0.3, 's' }  →  "0.3s" */
export function s(value: number): Time {
  return makeTime(value, 's');
}

// ---------------------------------------------------------------------------
// Angle
// ---------------------------------------------------------------------------

/** `45` → Angle{ 45, 'deg' }  →  "45deg" */
export function deg(value: number): Angle {
  return makeAngle(value, 'deg');
}

/** `1.57` → Angle{ 1.57, 'rad' }  →  "1.57rad" */
export function rad(value: number): Angle {
  return makeAngle(value, 'rad');
}

/** `0.5` → Angle{ 0.5, 'turn' }  →  "0.5turn" */
export function turn(value: number): Angle {
  return makeAngle(value, 'turn');
}
