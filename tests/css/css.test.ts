/**
 * @file css.test.ts
 * @description Integration tests for the css() entry point and compose helpers.
 *
 * Tests that css({...}) correctly resolves typed value objects to plain strings,
 * that merge/extend/define behave correctly, and that Grid/Flex descriptors
 * expand to multiple properties inside css().
 */

import { describe, expect, test } from 'vitest';
import { css } from '../../src/css/css';
import { merge, extend, define } from '../../src/css/compose';

// ---------------------------------------------------------------------------
// css() — inline style resolution
// ---------------------------------------------------------------------------

describe('css() — basic resolution', () => {
  test('passes plain string values through', () => {
    const result = css({ position: 'relative' });
    expect(result['position']).toBe('relative');
  });

  test('passes plain number values through', () => {
    const result = css({ zIndex: 10 });
    expect(result['zIndex']).toBe('10');
  });

  test('resolves css.px() to "Npx"', () => {
    const result = css({ padding: css.px(16) });
    expect(result['padding']).toBe('16px');
  });

  test('resolves css.rem() to "Nrem"', () => {
    const result = css({ fontSize: css.rem(1.25) });
    expect(result['fontSize']).toBe('1.25rem');
  });

  test('resolves css.color() to hex string', () => {
    const result = css({ background: css.color('#3b82f6') });
    expect(result['background']).toMatch(/^#[0-9a-f]{6}$/);
  });

  test('resolves css.ms() to "Nms"', () => {
    const result = css({ transitionDuration: css.ms(200) });
    expect(result['transitionDuration']).toBe('200ms');
  });

  test('skips undefined values', () => {
    const result = css({ padding: undefined });
    expect('padding' in result).toBe(false);
  });

  test('mixed-unit calc() resolves to calc() string', () => {
    const result = css({ width: css.vw(50).subtract(css.px(16)) });
    expect(result['width']).toBe('calc(50vw - 16px)');
  });

  test('shorthand array resolves to space-separated string', () => {
    const result = css({ padding: [css.rem(1), css.rem(2)] });
    expect(result['padding']).toBe('1rem 2rem');
  });
});

// ---------------------------------------------------------------------------
// css() — composite values
// ---------------------------------------------------------------------------

describe('css() — composite values', () => {
  test('resolves border to CSS string', () => {
    const result = css({ border: css.border({ color: css.color('#3b82f6'), width: 2 }) });
    expect(result['border']).toMatch(/^2px solid/);
  });

  test('resolves shadow to CSS string', () => {
    const result = css({ boxShadow: css.shadow({ y: 4, blur: 12, color: css.color.black.alpha(0.1) }) });
    expect(result['boxShadow']).toMatch(/^0 4px 12px/);
  });

  test('resolves transform to CSS string', () => {
    const result = css({ transform: css.transform({ scale: 1.1 }) });
    expect(result['transform']).toBe('scale(1.1)');
  });

  test('resolves transition to CSS string', () => {
    const result = css({
      transition: css.transition({ background: { duration: css.ms(200) } }),
    });
    expect(result['transition']).toBe('background 200ms');
  });
});

// ---------------------------------------------------------------------------
// css() — Grid and Flex expand to multiple properties
// ---------------------------------------------------------------------------

describe('css() — Grid descriptor expansion', () => {
  test('grid expands display and gridTemplateColumns', () => {
    const result = css({
      layout: css.grid({ columns: [css.px(200), css.px(400)], gap: css.px(16) }),
    });
    expect(result['display']).toBe('grid');
    expect(result['gridTemplateColumns']).toBe('200px 400px');
    expect(result['gap']).toBe('16px');
  });
});

describe('css() — Flex descriptor expansion', () => {
  test('flex expands display and flexDirection', () => {
    const result = css({
      layout: css.flex({ direction: 'row', align: 'center', gap: css.px(8) }),
    });
    expect(result['display']).toBe('flex');
    expect(result['flexDirection']).toBe('row');
    expect(result['alignItems']).toBe('center');
    expect(result['gap']).toBe('8px');
  });
});

// ---------------------------------------------------------------------------
// merge()
// ---------------------------------------------------------------------------

describe('merge()', () => {
  test('merges two style objects shallowly', () => {
    const a = { padding: css.px(8) };
    const b = { margin: css.px(4) };
    const result = merge(a, b);
    expect(result['padding']).toBe(a.padding);
    expect(result['margin']).toBe(b.margin);
  });

  test('later keys win on conflict', () => {
    const a = { padding: css.px(8) };
    const b = { padding: css.px(16) };
    const result = merge(a, b);
    expect(result['padding']).toBe(css.px(16).value === 16 ? b.padding : a.padding);
    // More explicit:
    expect((result['padding'] as ReturnType<typeof css.px>).value).toBe(16);
  });

  test('does not mutate inputs', () => {
    const a = { padding: css.px(8) };
    const b = { padding: css.px(16) };
    merge(a, b);
    expect((a['padding'] as ReturnType<typeof css.px>).value).toBe(8);
  });

  test('supports three or more arguments', () => {
    const result = merge({ a: '1' }, { b: '2' }, { c: '3' });
    expect(result['a']).toBe('1');
    expect(result['b']).toBe('2');
    expect(result['c']).toBe('3');
  });
});

// ---------------------------------------------------------------------------
// extend()
// ---------------------------------------------------------------------------

describe('extend()', () => {
  test('is equivalent to merge(base, overrides)', () => {
    const base   = { padding: css.px(8), color: 'red' };
    const overrides = { color: 'blue' };
    const result = extend(base, overrides);
    expect(result['color']).toBe('blue');
    expect((result['padding'] as ReturnType<typeof css.px>).value).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// define() — static form
// ---------------------------------------------------------------------------

describe('define() — static StyleObject', () => {
  test('returns the same object reference (identity)', () => {
    const style = { padding: css.px(16) };
    const defined = define(style);
    expect(defined).toBe(style);
  });

  test('can be passed to merge()', () => {
    const base = define({ borderRadius: css.px(4) });
    const primary = define({ background: css.color('#3b82f6') });
    const merged = merge(base, primary);
    expect(merged['borderRadius']).toBeDefined();
    expect(merged['background']).toBeDefined();
  });

  test('resolved via css() produces correct strings', () => {
    const fragment = define({ padding: css.px(16), borderRadius: css.px(4) });
    const result = css(fragment);
    expect(result['padding']).toBe('16px');
    expect(result['borderRadius']).toBe('4px');
  });
});

// ---------------------------------------------------------------------------
// define() — parameterized form
// ---------------------------------------------------------------------------

describe('define() — parameterized factory', () => {
  test('returns the factory function as-is', () => {
    const factory = (props: { size: 'sm' | 'lg' }) => ({
      padding: props.size === 'sm' ? css.px(8) : css.px(16),
    });
    const defined = define(factory);
    expect(typeof defined).toBe('function');
  });

  test('calling the factory with props returns correct style', () => {
    const cardStyle = define((props: { size: 'sm' | 'lg' }) => ({
      padding: props.size === 'sm' ? css.px(8) : css.px(16),
    }));

    const sm = css(cardStyle({ size: 'sm' }));
    const lg = css(cardStyle({ size: 'lg' }));

    expect(sm['padding']).toBe('8px');
    expect(lg['padding']).toBe('16px');
  });

  test('different props produce different styles', () => {
    const badgeStyle = define((props: { variant: 'success' | 'danger' }) => ({
      color: props.variant === 'success' ? css.color('#22c55e') : css.color('#ef4444'),
    }));

    const success = css(badgeStyle({ variant: 'success' }));
    const danger  = css(badgeStyle({ variant: 'danger' }));

    expect(success['color']).not.toBe(danger['color']);
  });
});
