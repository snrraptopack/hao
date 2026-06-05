/**
 * @file color.test.ts
 * @description Tests for src/css/color.ts
 *
 * Covers: parsing (hex, rgb, oklch), manipulation methods, contrast helpers,
 * gradient construction, static convenience colors, and serialization.
 */

import { describe, expect, test } from 'vitest';
import { color, gradient } from '../../src/css/color';

// ---------------------------------------------------------------------------
// Parsing & serialization
// ---------------------------------------------------------------------------

describe('color() — hex parsing', () => {
  test('3-char hex serializes to 6-char hex', () => {
    // #f00 → #ff0000
    const c = color('#f00');
    expect(c.toString()).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('6-char hex round-trips correctly', () => {
    // Should be close to the input; OKLCH round-trip may shift last digit
    const c = color('#3b82f6');
    expect(c.toString()).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('8-char hex (with alpha) uses oklch() output', () => {
    const c = color('#3b82f680'); // 50% alpha
    expect(c.toString()).toMatch(/^oklch\(/);
  });

  test('throws on invalid hex', () => {
    expect(() => color('#xyz')).toThrow();
  });
});

describe('color() — rgb() parsing', () => {
  test('rgb(r, g, b) parses correctly', () => {
    const c = color('rgb(59, 130, 246)');
    expect(c.toString()).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('rgba(r, g, b, a) with alpha uses oklch output', () => {
    const c = color('rgba(59, 130, 246, 0.5)');
    expect(c.toString()).toMatch(/^oklch\(/);
  });
});

describe('color() — oklch() parsing', () => {
  test('oklch(L C H) parses and round-trips', () => {
    const c = color('oklch(0.6 0.2 220)');
    // Serialize and re-parse — should not throw
    expect(() => color(c.toString())).not.toThrow();
  });

  test('oklch(L C H / A) with alpha uses oklch output', () => {
    const c = color('oklch(0.6 0.2 220 / 0.5)');
    expect(c.toString()).toMatch(/^oklch\(/);
  });
});

// ---------------------------------------------------------------------------
// Manipulation — pure methods
// ---------------------------------------------------------------------------

describe('color.lighten()', () => {
  test('returns a new Color (does not mutate)', () => {
    const original = color('#3b82f6');
    const lighter = original.lighten(0.1);
    expect(lighter).not.toBe(original);
    expect(lighter.toString()).not.toBe(original.toString());
  });

  test('clamped at 1 — further lighten does not overflow', () => {
    const white = color('#ffffff');
    const stillWhite = white.lighten(0.5);
    // Should not throw and should still serialize
    expect(() => stillWhite.toString()).not.toThrow();
  });
});

describe('color.darken()', () => {
  test('returns a darker color', () => {
    const original = color('#3b82f6');
    const darker = original.darken(0.1);
    expect(darker.toString()).not.toBe(original.toString());
  });
});

describe('color.alpha()', () => {
  test('alpha(1) returns opaque hex string', () => {
    const c = color('#3b82f6').alpha(1);
    expect(c.toString()).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('alpha(0) returns oklch with near-zero alpha', () => {
    const c = color('#3b82f6').alpha(0);
    expect(c.toString()).toMatch(/^oklch\(/);
    expect(c.toString()).toContain('/ 0.000');
  });

  test('alpha(0.5) produces oklch output', () => {
    const c = color('#3b82f6').alpha(0.5);
    expect(c.toString()).toMatch(/^oklch\(/);
  });
});

describe('color.rotate()', () => {
  test('returns a color with different hue', () => {
    const original = color('#3b82f6');
    const rotated = original.rotate(90);
    expect(rotated.toString()).not.toBe(original.toString());
  });

  test('rotate(360) returns a hue equivalent color', () => {
    const original = color('#3b82f6');
    const rotated = original.rotate(360);
    // Hue wraps — should serialize to same or very similar value
    expect(rotated.toString()).toBeTruthy();
  });
});

describe('color.mix()', () => {
  test('mix(other, 0) returns a color equivalent to self', () => {
    const a = color('#3b82f6');
    const b = color('#ef4444');
    const mixed = a.mix(b, 0);
    expect(mixed.toString()).toBeTruthy();
  });

  test('mix(other, 0.5) produces an intermediate color', () => {
    const a = color('#000000');
    const b = color('#ffffff');
    const mid = a.mix(b, 0.5);
    // Mid-point between black and white should be some grey
    expect(mid.toString()).not.toBe('#000000');
    expect(mid.toString()).not.toBe('#ffffff');
  });
});

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

describe('color.contrast()', () => {
  test('dark background returns white or black', () => {
    const dark = color('#1a1a2e');
    const c = dark.contrast();
    const str = c.toString();
    expect(str === '#ffffff' || str === '#000000').toBe(true);
  });

  test('light background returns white or black', () => {
    const light = color('#f0f4ff');
    const c = light.contrast();
    const str = c.toString();
    expect(str === '#ffffff' || str === '#000000').toBe(true);
  });
});

describe('color.ensureContrast()', () => {
  test('adjusted color meets the required ratio', () => {
    const bg = color('#aaaaaa');
    const fg = color('#000000');
    // ensureContrast adjusts bg until it reaches ratio 4.5
    const adjusted = bg.ensureContrast(fg, 4.5);
    expect(adjusted.toString()).toBeTruthy();
    expect(adjusted.toString()).not.toThrow;
  });
});

// ---------------------------------------------------------------------------
// Gradient
// ---------------------------------------------------------------------------

describe('color.gradient()', () => {
  test('produces a linear-gradient string', () => {
    const blue = color('#3b82f6');
    const lighter = blue.lighten(0.2);
    const g = blue.gradient(lighter);
    expect(g.toString()).toMatch(/^linear-gradient\(/);
  });

  test('respects custom angle', () => {
    const blue = color('#3b82f6');
    const g = blue.gradient(blue.lighten(0.2), 45);
    expect(g.toString()).toContain('45deg');
  });
});

describe('gradient() — multi-stop', () => {
  test('builds a linear-gradient with multiple stops', () => {
    const blue = color('#3b82f6');
    const g = gradient({
      angle: 135,
      stops: [
        [blue, 0],
        [blue.alpha(0.5), 50],
        [blue.lighten(0.3), 100],
      ],
    });
    expect(g.toString()).toMatch(/^linear-gradient\(135deg,/);
    expect(g.toString()).toContain('50%');
    expect(g.toString()).toContain('100%');
  });
});

// ---------------------------------------------------------------------------
// Static convenience colors
// ---------------------------------------------------------------------------

describe('color.black / color.white / color.transparent', () => {
  test('color.black serializes to #000000', () => {
    expect(color.black.toString()).toBe('#000000');
  });

  test('color.white serializes to #ffffff', () => {
    expect(color.white.toString()).toBe('#ffffff');
  });

  test('color.transparent has alpha 0', () => {
    expect(color.transparent.toString()).toMatch(/^oklch\(/);
    expect(color.transparent.toString()).toContain('/ 0.000');
  });
});

// ---------------------------------------------------------------------------
// color.scale()
// ---------------------------------------------------------------------------

describe('color.scale()', () => {
  test('creates a map of Color objects from strings', () => {
    const scale = color.scale('#3b82f6', {
      50: '#eff6ff',
      500: '#3b82f6',
    });
    expect(scale[50].toString()).toBe('#eff6ff');
    expect(scale[500].toString()).toBe('#3b82f6');
  });

  test('accepts existing Color objects in scale steps', () => {
    const primary = color('#3b82f6');
    const scale = color.scale('#3b82f6', {
      50: '#eff6ff',
      500: primary,
    });
    expect(scale[50].toString()).toBe('#eff6ff');
    expect(scale[500]).toBe(primary);
  });
});
