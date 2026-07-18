/**
 * Unit tests for shared/deep-equal (P4 — SWR comparisons).
 */
import { describe, expect, test } from 'vitest';
import { deepEqual } from '../../src/shared/deep-equal';

describe('deepEqual', () => {
  test('primitives and NaN', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });

  test('object keys are order-insensitive', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  test('nested structures and arrays', () => {
    expect(deepEqual({ list: [1, { x: [2, 3] }] }, { list: [1, { x: [2, 3] }] })).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual({ a: [1] }, { a: { 0: 1 } })).toBe(false);
  });

  test('dates compare by time', () => {
    expect(deepEqual(new Date(1000), new Date(1000))).toBe(true);
    expect(deepEqual(new Date(1000), new Date(2000))).toBe(false);
    expect(deepEqual(new Date(1000), 1000)).toBe(false);
  });

  test('BigInt does not throw (JSON.stringify did)', () => {
    expect(() => deepEqual({ n: 1n }, { n: 1n })).not.toThrow();
    expect(deepEqual({ n: 1n }, { n: 1n })).toBe(true);
    expect(deepEqual({ n: 1n }, { n: 2n })).toBe(false);
  });

  test('circular structures do not throw', () => {
    const a: Record<string, unknown> = { x: 1 };
    a.self = a;
    const b: Record<string, unknown> = { x: 1 };
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);

    const c: Record<string, unknown> = { x: 2 };
    c.self = c;
    expect(deepEqual(a, c)).toBe(false);

    const d: Record<string, unknown> = { x: 1 };
    d.self = d;
    expect(deepEqual(a, { x: 1, self: {} })).toBe(false);
  });

  test('functions compare by identity', () => {
    const fn = () => 1;
    expect(deepEqual({ fn }, { fn })).toBe(true);
    expect(deepEqual({ fn: () => 1 }, { fn: () => 1 })).toBe(false);
  });
});
