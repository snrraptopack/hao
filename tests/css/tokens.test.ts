/**
 * @file tokens.test.ts
 * @description Tests for design token builders in tokens.ts and related color tools.
 */

import { describe, expect, test } from 'vitest';
import { css } from '../../src/css/css';

describe('tokens module tests', () => {
  // Test css.scale()
  test('css.scale computes geometric scales correctly', () => {
    const scale = css.scale({
      base: css.px(4),
      ratio: 1.5,
      steps: {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
      },
    });

    expect(scale.xs.toString()).toBe('6px');          // 4 * 1.5^1 = 6
    expect(scale.sm.toString()).toBe('9px');          // 4 * 1.5^2 = 9
    expect(scale.md.toString()).toBe('13.5px');       // 4 * 1.5^3 = 13.5
    expect(scale.lg.toString()).toBe('20.25px');      // 4 * 1.5^4 = 20.25
  });

  // Test css.typeScale()
  test('css.typeScale computes geometric typographic steps, including negative ones', () => {
    const scale = css.typeScale({
      base: css.rem(1),
      ratio: 1.25,
      steps: {
        caption: -1,
        body: 0,
        h2: 2,
      },
    });

    expect(scale.caption.toString()).toBe('0.8rem');  // 1 / 1.25 = 0.8
    expect(scale.body.toString()).toBe('1rem');       // 1 * 1.25^0 = 1
    expect(scale.h2.toString()).toBe('1.5625rem');    // 1 * 1.25^2 = 1.5625
  });

  // Test css.fontStack()
  test('css.fontStack formats and quotes multi-word fonts correctly', () => {
    const stack = css.fontStack(['Inter', 'Segoe UI', 'sans-serif']);
    expect(stack).toBe('Inter, "Segoe UI", sans-serif');

    const mono = css.fontStack(['Fira Code', 'Courier New', 'monospace']);
    expect(mono).toBe('"Fira Code", "Courier New", monospace');
  });

  // Test css.elevation()
  test('css.elevation generates structured box shadows derived from base color', () => {
    const shadows = css.elevation({
      base: css.color('#000000').alpha(0.1),
      levels: [
        { y: 1, blur: 3 },
        { y: 4, blur: 8, spread: 2 },
      ],
    });

    expect(shadows).toHaveLength(2);
    expect(shadows[0].toString()).toContain('1px 3px');
    expect(shadows[0].toString()).toContain('oklch(');
    expect(shadows[1].toString()).toContain('4px 8px 2px');
  });

  // Test css.spring()
  test('css.spring produces valid sampled CSS linear() easing curve', () => {
    const springString = css.spring({ stiffness: 300, damping: 25 });
    expect(springString).toMatch(/^linear\(/);
    expect(springString).toContain('0.0000 0.0%');
    expect(springString).toContain('100.0%');
  });

  // Test css.tokens()
  test('css.tokens behaves as an identity function preserving types', () => {
    const themeConfig = {
      colors: {
        primary: css.color('#00ff00'),
      },
    };
    const resolvedTheme = css.tokens(themeConfig);
    expect(resolvedTheme).toBe(themeConfig);
    expect(resolvedTheme.colors.primary.toString()).toBe('#00ff00');
  });

  // Test css.color.scale()
  test('css.color.scale constructs mapped colors', () => {
    const scale = css.color.scale('#3b82f6', {
      500: '#3b82f6',
      600: '#2563eb',
    });

    expect(scale[500].toString()).toBe('#3b82f6');
    expect(scale[600].toString()).toBe('#2563eb');
  });

  // Test css.color.group()
  test('css.color.group derives correct interactive states and default fallbacks', () => {
    const baseColor = css.color('#0000ff'); // Blue
    const group = css.color.group({
      base: baseColor,
      hover: 'lighten(0.2)',
      active: 'darken(0.2)',
      disabled: 'alpha(0.5)',
    });

    expect(group.base.toString()).toBe(baseColor.toString());
    expect(group.hover.toString()).not.toBe(baseColor.toString());
    expect(group.active.toString()).not.toBe(baseColor.toString());
    expect(group.disabled.toString()).toContain('/ 0.500');

    // Default fallbacks
    const defaultGroup = css.color.group({ base: baseColor });
    expect(defaultGroup.hover.toString()).not.toBe(baseColor.toString());
    expect(defaultGroup.active.toString()).not.toBe(baseColor.toString());
    expect(defaultGroup.disabled.toString()).toContain('/ 0.350');
  });

  // Test css.color.palette()
  test('css.color.palette generates a balanced 11-step scale from a seed color', () => {
    const seed = css.color('#3b82f6');
    const palette = css.color.palette(seed);

    // Should contain all 11 keys
    expect(palette[50]).toBeDefined();
    expect(palette[100]).toBeDefined();
    expect(palette[200]).toBeDefined();
    expect(palette[300]).toBeDefined();
    expect(palette[400]).toBeDefined();
    expect(palette[500]).toBeDefined();
    expect(palette[600]).toBeDefined();
    expect(palette[700]).toBeDefined();
    expect(palette[800]).toBeDefined();
    expect(palette[900]).toBeDefined();
    expect(palette[950]).toBeDefined();

    // 500 should be the exact seed color
    expect(palette[500].toString()).toBe(seed.toString());

    // Lightness should decrease as weight increases
    const getL = (colorObj: any) => {
      const str = colorObj.toString();
      if (str.startsWith('#')) {
        const hex = str.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      const parts = str.match(/oklch\(([\d.]+)/);
      return parts ? parseFloat(parts[1]) : 0;
    };

    const l50 = getL(palette[50]);
    const l300 = getL(palette[300]);
    const l500 = getL(palette[500]);
    const l800 = getL(palette[800]);
    const l950 = getL(palette[950]);

    expect(l50).toBeGreaterThan(l300);
    expect(l300).toBeGreaterThan(l500);
    expect(l500).toBeGreaterThan(l800);
    expect(l800).toBeGreaterThan(l950);
  });
});
