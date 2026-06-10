/**
 * @file conditionals.test.ts
 * @description Tests for src/css/conditionals.ts
 *
 * Covers: css.when() boolean branching, css.match() union matching,
 * css.mergeWhen() for multiple independent conditions, and the interaction
 * between css.define() and css.match() for parameterized style factories.
 *
 * Each group documents the runtime semantics that the compiler will later
 * replace with static class lookups.
 */

import { describe, expect, test } from 'vitest';
import { css } from '../../src/css/css';
import { when, match, mergeWhen } from '../../src/css/conditionals';
import { define } from '../../src/css/compose';
import { px } from '../../src/css/units';
import { color } from '../../src/css/color';

// ---------------------------------------------------------------------------
// css.when() — boolean branching
// ---------------------------------------------------------------------------

describe('css.when() — boolean branching', () => {
  test('returns the true branch when condition is true', () => {
    const isActive = true;
    const style = when(isActive, {
      true:  { background: color('#3b82f6') },
      false: { background: color('#e5e7eb') },
    });
    expect((style as { background: ReturnType<typeof color> }).background.toString())
      .toMatch(/^#3b82f6/i);
  });

  test('returns the false branch when condition is false', () => {
    const isActive = false;
    const style = when(isActive, {
      true:  { background: color('#3b82f6') },
      false: { background: color('#e5e7eb') },
    });
    expect((style as { background: ReturnType<typeof color> }).background.toString())
      .toMatch(/^#e5e7eb/i);
  });

  test('works with scalar CSSValues (inline use)', () => {
    const disabled = true;
    const opacity = when(disabled, { true: 0.4, false: 1 });
    expect(opacity).toBe(0.4);

    const enabled = false;
    const opacity2 = when(enabled, { true: 0.4, false: 1 });
    expect(opacity2).toBe(1);
  });

  test('returns the cursor string for disabled state', () => {
    const disabled = true;
    const cursor = when(disabled, { true: 'not-allowed', false: 'pointer' });
    expect(cursor).toBe('not-allowed');
  });

  test('returns empty object when active branch is not defined', () => {
    const isActive = true;
    const result = when(isActive, { false: 'grey' });
    expect(result).toEqual({});

    const isInactive = false;
    const result2 = when(isInactive, { true: 'blue' });
    expect(result2).toEqual({});
  });

  test('falls back to default when true branch is omitted', () => {
    const result = when(true, { false: 'grey', default: 'blue' });
    expect(result).toBe('blue');
  });

  test('falls back to default when false branch is omitted', () => {
    const result = when(false, { true: 'blue', default: 'grey' });
    expect(result).toBe('grey');
  });

  test('prefers explicit true branch over default', () => {
    const result = when(true, { true: 'blue', default: 'grey' });
    expect(result).toBe('blue');
  });

  test('prefers explicit false branch over default', () => {
    const result = when(false, { false: 'grey', default: 'blue' });
    expect(result).toBe('grey');
  });

  test('default works with StyleObject branches', () => {
    const result = when(false, {
      true: { background: color('#3b82f6') },
      default: { background: color('#e5e7eb') },
    });
    expect((result as { background: ReturnType<typeof color> }).background.toString())
      .toMatch(/^#e5e7eb/i);
  });
});

describe('css.when() — resolves via css()', () => {
  test('resolved true-branch produces correct string values', () => {
    const active = true;
    const style = css({
      padding: when(active, { true: px(16), false: px(8) }),
    });
    expect(style['padding']).toBe('16px');
  });

  test('resolved false-branch produces correct string values', () => {
    const active = false;
    const style = css({
      padding: when(active, { true: px(16), false: px(8) }),
    });
    expect(style['padding']).toBe('8px');
  });

  test('full StyleObject branch resolves all properties', () => {
    const hovered = true;
    const resolved = css(
      when(hovered, {
        true:  { background: color('#2563eb'), transform: css.transform({ scale: 1.02 }) },
        false: { background: color('#3b82f6') },
      }) as Parameters<typeof css>[0],
    );
    expect(resolved['transform']).toBe('scale(1.02)');
    expect(resolved['background']).toMatch(/^#2563eb/i);
  });
});

// ---------------------------------------------------------------------------
// css.match() — union discriminant matching
// ---------------------------------------------------------------------------

describe('css.match() — basic union matching', () => {
  test('returns the correct case for "primary"', () => {
    type Variant = 'primary' | 'secondary' | 'ghost';
    const style = match<Variant, { background: string }>('primary', {
      primary:   { background: '#3b82f6' },
      secondary: { background: 'transparent' },
      ghost:     { background: 'transparent' },
    });
    expect(style.background).toBe('#3b82f6');
  });

  test('returns the correct case for "ghost"', () => {
    type Variant = 'primary' | 'secondary' | 'ghost';
    const style = match<Variant, { background: string }>('ghost', {
      primary:   { background: '#3b82f6' },
      secondary: { background: 'transparent' },
      ghost:     { background: 'transparent' },
    });
    expect(style.background).toBe('transparent');
  });

  test('matches boolean union values', () => {
    const isTrue = true;
    const style = match<boolean, { background: string }>(isTrue, {
      true:  { background: 'blue' },
      false: { background: 'gray' },
    });
    expect(style.background).toBe('blue');
  });

  test('matches numeric union values', () => {
    type Level = 1 | 2 | 3;
    const level: Level = 2;
    const style = match<Level, { background: string }>(level, {
      1: { background: 'light' },
      2: { background: 'medium' },
      3: { background: 'dark' },
    });
    expect(style.background).toBe('medium');
  });

  test('throws when called with an unhandled string value', () => {
    // Simulates a runtime mismatch from an untyped source (e.g. API response)
    expect(() =>
      match('unknown' as 'primary', { primary: { background: 'blue' } }),
    ).toThrow(/no case for "unknown"/);
  });
});

describe('css.match() — with typed length values', () => {
  test('returns correct Length for each size key', () => {
    type Size = 'sm' | 'md' | 'lg';
    const padding = match<Size, ReturnType<typeof px>>('md', {
      sm: px(8),
      md: px(16),
      lg: px(24),
    });
    expect(padding.toString()).toBe('16px');
  });

  test('resolves inside css() correctly', () => {
    type Size = 'sm' | 'md' | 'lg';
    const size: Size = 'lg';
    const resolved = css({
      padding: match(size, { sm: px(8), md: px(16), lg: px(24) }),
    });
    expect(resolved['padding']).toBe('24px');
  });
});

describe('css.match() — string value matching', () => {
  test('matches cursor style to disabled state', () => {
    type State = 'enabled' | 'disabled' | 'loading';
    const cursor = match<State, string>('disabled', {
      enabled:  'pointer',
      disabled: 'not-allowed',
      loading:  'wait',
    });
    expect(cursor).toBe('not-allowed');
  });
});

// ---------------------------------------------------------------------------
// css.mergeWhen() — multiple independent boolean conditions
// ---------------------------------------------------------------------------

describe('css.mergeWhen()', () => {
  test('applies no styles when all conditions are false', () => {
    const result = mergeWhen([
      [false, { opacity: 0.5 }],
      [false, { background: 'red' }],
    ]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  test('applies only the true-condition styles', () => {
    const isSelected = true;
    const isDragging = false;
    const result = mergeWhen([
      [isSelected, { outline: '2px solid blue' }],
      [isDragging, { opacity: 0.6 }],
    ]);
    expect(result['outline']).toBe('2px solid blue');
    expect(result['opacity']).toBeUndefined();
  });

  test('merges all true-condition styles in order', () => {
    const result = mergeWhen([
      [true, { opacity: 0.5, background: 'red' }],
      [true, { background: 'blue' }],  // overrides background from first
    ]);
    expect(result['opacity']).toBe(0.5);
    expect(result['background']).toBe('blue');
  });

  test('later conditions override earlier ones on conflict', () => {
    const result = mergeWhen([
      [true, { padding: px(8) }],
      [true, { padding: px(16) }],
    ]);
    expect((result['padding'] as ReturnType<typeof px>).value).toBe(16);
  });

  test('resolves via css()', () => {
    const isActive   = true;
    const isDisabled = false;
    const resolved = css(
      mergeWhen([
        [isActive,   { background: color('#3b82f6') }],
        [isDisabled, { opacity: 0.4, cursor: 'not-allowed' }],
      ]),
    );
    expect(resolved['background']).toMatch(/^#3b82f6/i);
    expect(resolved['opacity']).toBeUndefined();
    expect(resolved['cursor']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// css.define() + css.match() — parameterized style factory
// This is the primary pattern from the roadmap for Milestone 2.
// ---------------------------------------------------------------------------

describe('css.define() + css.match() — parameterized factory', () => {
  test('size factory produces correct padding for each variant', () => {
    const cardStyle = define((props: { size: 'sm' | 'md' | 'lg' }) => ({
      padding: match(props.size, {
        sm: px(8),
        md: px(16),
        lg: px(24),
      }),
      borderRadius: px(8),
    }));

    expect(css(cardStyle({ size: 'sm' }))['padding']).toBe('8px');
    expect(css(cardStyle({ size: 'md' }))['padding']).toBe('16px');
    expect(css(cardStyle({ size: 'lg' }))['padding']).toBe('24px');
    // Shared property is consistent across all variants
    expect(css(cardStyle({ size: 'sm' }))['borderRadius']).toBe('8px');
  });

  test('variant + boolean factory combines match and when', () => {
    const buttonStyle = define((props: { variant: 'primary' | 'secondary'; disabled: boolean }) => ({
      background: match(props.variant, {
        primary:   color('#3b82f6'),
        secondary: color('#e5e7eb'),
      }),
      opacity: when(props.disabled, { true: 0.4, false: 1 }),
      cursor:  when(props.disabled, { true: 'not-allowed', false: 'pointer' }),
    }));

    const enabledPrimary  = css(buttonStyle({ variant: 'primary',   disabled: false }));
    const disabledPrimary = css(buttonStyle({ variant: 'primary',   disabled: true  }));
    const secondary       = css(buttonStyle({ variant: 'secondary', disabled: false }));

    // Correct background per variant
    expect(enabledPrimary['background']).toMatch(/^#3b82f6/i);
    expect(secondary['background']).toMatch(/^#e5e7eb/i);

    // Disabled state
    expect(disabledPrimary['opacity']).toBe('0.4');
    expect(disabledPrimary['cursor']).toBe('not-allowed');

    // Enabled state
    expect(enabledPrimary['opacity']).toBe('1');
    expect(enabledPrimary['cursor']).toBe('pointer');
  });

  test('factory call is pure — same props produce equal output', () => {
    const style = define((props: { size: 'sm' | 'lg' }) => ({
      padding: match(props.size, { sm: px(8), lg: px(24) }),
    }));

    const a = css(style({ size: 'sm' }));
    const b = css(style({ size: 'sm' }));
    expect(a['padding']).toBe(b['padding']);
  });
});

// ---------------------------------------------------------------------------
// Integration — all conditionals through the css object
// ---------------------------------------------------------------------------

describe('css.when / css.match / css.mergeWhen via css object', () => {
  test('css.when is accessible on the css namespace', () => {
    expect(typeof css.when).toBe('function');
  });

  test('css.match is accessible on the css namespace', () => {
    expect(typeof css.match).toBe('function');
  });

  test('css.mergeWhen is accessible on the css namespace', () => {
    expect(typeof css.mergeWhen).toBe('function');
  });

  test('css.when works through the css namespace', () => {
    const active = true;
    const result = css.when(active, { true: 'blue', false: 'grey' });
    expect(result).toBe('blue');
  });

  test('css.match works through the css namespace', () => {
    type S = 'sm' | 'lg';
    const result = css.match<S, string>('lg', { sm: '8px', lg: '24px' });
    expect(result).toBe('24px');
  });
});
