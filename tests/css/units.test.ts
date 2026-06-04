/**
 * @file units.test.ts
 * @description Tests for src/css/units.ts
 *
 * Covers: all length factories, arithmetic, mixed-unit calc(), clamp(),
 * time factories and arithmetic, angle factories, and the zero() sentinel.
 */

import { describe, expect, test } from 'vitest';
import { px, rem, em, vw, vh, pct, fr, ch, zero, clamp, ms, s, deg, rad, turn } from '../../src/css/units';

// ---------------------------------------------------------------------------
// Length factories
// ---------------------------------------------------------------------------

describe('px()', () => {
  test('serializes to "Npx"', () => {
    expect(px(16).toString()).toBe('16px');
  });

  test('zero px serializes to "0" (no unit)', () => {
    expect(px(0).toString()).toBe('0');
  });

  test('exposes value and unit', () => {
    const l = px(8);
    expect(l.value).toBe(8);
    expect(l.unit).toBe('px');
  });
});

describe('rem()', () => {
  test('serializes to "Nrem"', () => {
    expect(rem(1.5).toString()).toBe('1.5rem');
  });
});

describe('pct()', () => {
  test('serializes to "N%"', () => {
    expect(pct(50).toString()).toBe('50%');
  });
});

describe('fr()', () => {
  test('serializes to "Nfr"', () => {
    expect(fr(1).toString()).toBe('1fr');
  });

  test('zero fr still emits "0fr" because fr is a flex unit', () => {
    // fr(0) is unusual but valid; our impl special-cases px/rem/etc to "0" but fr(0) → "0fr"
    // because fr is a grid-specific unit and "0" alone has no meaning in grid-template columns
    expect(fr(0).toString()).toBe('0fr');
  });
});

describe('zero()', () => {
  test('serializes to "0"', () => {
    expect(zero().toString()).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// Same-unit arithmetic
// ---------------------------------------------------------------------------

describe('Length arithmetic — same unit', () => {
  test('add returns a new Length, same unit', () => {
    const result = px(8).add(px(8));
    expect(result.toString()).toBe('16px');
  });

  test('subtract returns a new Length', () => {
    const result = px(20).subtract(px(4));
    expect(result.toString()).toBe('16px');
  });

  test('multiply returns a new Length', () => {
    expect(px(8).multiply(2).toString()).toBe('16px');
  });

  test('divide returns a new Length', () => {
    expect(px(32).divide(2).toString()).toBe('16px');
  });

  test('divide by zero throws RangeError', () => {
    expect(() => px(16).divide(0)).toThrow(RangeError);
  });

  test('arithmetic does not mutate the original', () => {
    const a = px(10);
    a.add(px(5));
    expect(a.toString()).toBe('10px');
  });
});

// ---------------------------------------------------------------------------
// Mixed-unit arithmetic → calc()
// ---------------------------------------------------------------------------

describe('Length arithmetic — mixed units', () => {
  test('add with different units produces calc()', () => {
    const result = vw(50).add(px(100));
    expect(result.toString()).toBe('calc(50vw + 100px)');
  });

  test('subtract with different units produces calc()', () => {
    const result = vw(100).subtract(px(16));
    expect(result.toString()).toBe('calc(100vw - 16px)');
  });

  test('calc result has _tag Calc', () => {
    const result = vw(50).add(rem(2));
    expect((result as { _tag: string })._tag).toBe('Calc');
  });
});

// ---------------------------------------------------------------------------
// clamp()
// ---------------------------------------------------------------------------

describe('clamp()', () => {
  test('serializes to CSS clamp()', () => {
    const result = clamp(rem(1), vw(4), px(64));
    expect(result.toString()).toBe('clamp(1rem, 4vw, 64px)');
  });

  test('has _tag Clamp', () => {
    const result = clamp(px(10), px(20), px(30));
    expect(result._tag).toBe('Clamp');
  });
});

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

describe('ms()', () => {
  test('serializes to "Nms"', () => {
    expect(ms(200).toString()).toBe('200ms');
  });

  test('add combines milliseconds', () => {
    expect(ms(100).add(ms(50)).toString()).toBe('150ms');
  });

  test('multiply scales time', () => {
    expect(ms(100).multiply(3).toString()).toBe('300ms');
  });
});

describe('s()', () => {
  test('serializes to "Ns"', () => {
    expect(s(0.3).toString()).toBe('0.3s');
  });

  test('add between s values normalizes through ms to avoid float drift', () => {
    // 0.2s + 0.1s: impl converts to ms (200 + 100 = 300), then back to s → "0.3s"
    // This is correct and intentional — the ms normalization avoids float imprecision
    expect(s(0.2).add(s(0.1)).toString()).toBe('0.3s');
  });
});

// ---------------------------------------------------------------------------
// Angle
// ---------------------------------------------------------------------------

describe('deg()', () => {
  test('serializes to "Ndeg"', () => {
    expect(deg(45).toString()).toBe('45deg');
  });
});

describe('rad()', () => {
  test('serializes to "Nrad"', () => {
    expect(rad(1.57).toString()).toBe('1.57rad');
  });
});

describe('turn()', () => {
  test('serializes to "Nturn"', () => {
    expect(turn(0.5).toString()).toBe('0.5turn');
  });
});

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

describe('em() / vh() / ch()', () => {
  test('em serializes correctly', () => {
    expect(em(1.2).toString()).toBe('1.2em');
  });
  test('vh serializes correctly', () => {
    expect(vh(100).toString()).toBe('100vh');
  });
  test('ch serializes correctly', () => {
    expect(ch(20).toString()).toBe('20ch');
  });
});
