/**
 * @file values.test.ts
 * @description Tests for src/css/values.ts
 *
 * Covers: border, shadow, transform (including compose), transition, ease,
 * outline, grid.toProperties(), and flex.toProperties().
 */

import { describe, expect, test } from 'vitest';
import { border, shadow, transform, transition, ease, outline, grid, flex } from '../../src/css/values';
import { px, ms, deg } from '../../src/css/units';
import { color } from '../../src/css/color';

// ---------------------------------------------------------------------------
// border()
// ---------------------------------------------------------------------------

describe('border()', () => {
  test('default border is "1px solid"', () => {
    const b = border();
    expect(b.toString()).toBe('1px solid');
  });

  test('with color includes color string', () => {
    const b = border({ color: color('#3b82f6'), width: 2, style: 'solid' });
    expect(b.toString()).toMatch(/^2px solid #/);
  });

  test('with px() width', () => {
    const b = border({ width: px(2) });
    expect(b.toString()).toContain('2px');
  });

  test('border.none() serializes to "none"', () => {
    expect(border.none().toString()).toBe('none');
  });

  test('border.none() has style none', () => {
    expect(border.none().style).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// shadow()
// ---------------------------------------------------------------------------

describe('shadow()', () => {
  test('serializes x, y, blur, spread, color in order', () => {
    const s = shadow({ x: 0, y: 2, blur: 8, spread: 0, color: color.black });
    expect(s.toString()).toBe('0 2px 8px 0 #000000');
  });

  test('inset flag prepends "inset"', () => {
    const s = shadow({ x: 0, y: 1, blur: 2, color: color.black, inset: true });
    expect(s.toString()).toMatch(/^inset /);
  });

  test('shadow.inset() shorthand sets inset=true', () => {
    const s = shadow.inset({ x: 0, y: 1, blur: 2, color: color.black });
    expect(s.inset).toBe(true);
    expect(s.toString()).toMatch(/^inset /);
  });

  test('color is serialized in output', () => {
    const c = color('#3b82f6');
    const s = shadow({ y: 4, blur: 10, color: c });
    expect(s.toString()).toContain(c.toString());
  });
});

// ---------------------------------------------------------------------------
// transform()
// ---------------------------------------------------------------------------

describe('transform()', () => {
  test('translateX emits translateX()', () => {
    const t = transform({ translateX: px(10) });
    expect(t.toString()).toBe('translateX(10px)');
  });

  test('scale emits scale()', () => {
    const t = transform({ scale: 1.1 });
    expect(t.toString()).toBe('scale(1.1)');
  });

  test('rotate with number uses deg', () => {
    const t = transform({ rotate: 45 });
    expect(t.toString()).toBe('rotate(45deg)');
  });

  test('rotate with Angle object', () => {
    const t = transform({ rotate: deg(90) });
    expect(t.toString()).toBe('rotate(90deg)');
  });

  test('multiple properties join with space', () => {
    const t = transform({ translateX: px(10), scale: 1.1 });
    expect(t.toString()).toBe('translateX(10px) scale(1.1)');
  });

  test('empty options serialize to "none"', () => {
    const t = transform({});
    expect(t.toString()).toBe('none');
  });

  test('compose() merges two transforms', () => {
    const a = transform({ translateX: px(10) });
    const b = transform({ scale: 1.2 });
    const c = a.compose(b);
    expect(c.toString()).toBe('translateX(10px) scale(1.2)');
  });

  test('compose() does not mutate originals', () => {
    const a = transform({ translateX: px(10) });
    const b = transform({ scale: 1.2 });
    a.compose(b);
    expect(a.toString()).toBe('translateX(10px)');
  });
});

// ---------------------------------------------------------------------------
// transition()
// ---------------------------------------------------------------------------

describe('transition()', () => {
  test('single property serializes correctly', () => {
    const t = transition({ background: { duration: ms(200) } });
    expect(t.toString()).toBe('background 200ms');
  });

  test('with easing appended', () => {
    const t = transition({ transform: { duration: ms(300), easing: 'ease-out' } });
    expect(t.toString()).toBe('transform 300ms ease-out');
  });

  test('with delay appended', () => {
    const t = transition({ opacity: { duration: ms(200), delay: ms(50) } });
    expect(t.toString()).toBe('opacity 200ms 50ms');
  });

  test('multiple properties join with comma', () => {
    const t = transition({
      background: { duration: ms(200) },
      transform:  { duration: ms(300) },
    });
    expect(t.toString()).toBe('background 200ms, transform 300ms');
  });
});

// ---------------------------------------------------------------------------
// ease()
// ---------------------------------------------------------------------------

describe('ease()', () => {
  test('"in" → "ease-in"', () => {
    expect(ease('in')).toBe('ease-in');
  });
  test('"out" → "ease-out"', () => {
    expect(ease('out')).toBe('ease-out');
  });
  test('"in-out" → "ease-in-out"', () => {
    expect(ease('in-out')).toBe('ease-in-out');
  });
  test('"spring" → cubic-bezier', () => {
    expect(ease('spring')).toMatch(/^cubic-bezier/);
  });
});

// ---------------------------------------------------------------------------
// outline()
// ---------------------------------------------------------------------------

describe('outline()', () => {
  test('produces a string shorthand', () => {
    const o = outline({ color: color('#3b82f6'), width: 2 });
    expect(o).toMatch(/^2px solid /);
  });

  test('default width is 1px', () => {
    const o = outline({ color: color.black });
    expect(o).toMatch(/^1px solid/);
  });
});

// ---------------------------------------------------------------------------
// grid()
// ---------------------------------------------------------------------------

describe('grid()', () => {
  test('toProperties() includes display:grid', () => {
    const props = grid({ columns: [px(200)] }).toProperties();
    expect(props['display']).toBe('grid');
  });

  test('columns serialize to gridTemplateColumns', () => {
    const props = grid({ columns: [px(200), px(400)] }).toProperties();
    expect(props['gridTemplateColumns']).toBe('200px 400px');
  });

  test('rows serialize to gridTemplateRows', () => {
    const props = grid({ rows: [px(60), px(100)] }).toProperties();
    expect(props['gridTemplateRows']).toBe('60px 100px');
  });

  test('areas serialize to gridTemplateAreas', () => {
    const props = grid({
      areas: [
        ['header', 'sidebar'],
        ['main',   'sidebar'],
      ],
    }).toProperties();
    expect(props['gridTemplateAreas']).toBe('"header sidebar" "main sidebar"');
  });

  test('gap serializes to gap', () => {
    const props = grid({ gap: px(16) }).toProperties();
    expect(props['gap']).toBe('16px');
  });
});

// ---------------------------------------------------------------------------
// flex()
// ---------------------------------------------------------------------------

describe('flex()', () => {
  test('toProperties() includes display:flex', () => {
    const props = flex({}).toProperties();
    expect(props['display']).toBe('flex');
  });

  test('direction sets flexDirection', () => {
    const props = flex({ direction: 'column' }).toProperties();
    expect(props['flexDirection']).toBe('column');
  });

  test('wrap=true sets flexWrap:wrap', () => {
    const props = flex({ wrap: true }).toProperties();
    expect(props['flexWrap']).toBe('wrap');
  });

  test('wrap=false sets flexWrap:nowrap', () => {
    const props = flex({ wrap: false }).toProperties();
    expect(props['flexWrap']).toBe('nowrap');
  });

  test('wrap="reverse" sets flexWrap:wrap-reverse', () => {
    const props = flex({ wrap: 'reverse' }).toProperties();
    expect(props['flexWrap']).toBe('wrap-reverse');
  });

  test('align sets alignItems', () => {
    const props = flex({ align: 'center' }).toProperties();
    expect(props['alignItems']).toBe('center');
  });

  test('justify sets justifyContent', () => {
    const props = flex({ justify: 'space-between' }).toProperties();
    expect(props['justifyContent']).toBe('space-between');
  });

  test('gap sets gap', () => {
    const props = flex({ gap: px(12) }).toProperties();
    expect(props['gap']).toBe('12px');
  });
});
