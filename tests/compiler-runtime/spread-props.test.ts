import { describe, expect, test } from 'vitest';
import { __spreadProps } from '../../src/compiler-runtime/dom-setters';

describe('__spreadProps event listener management', () => {
  test('adds event listeners from spread', () => {
    const el = document.createElement('button');
    let count = 0;
    __spreadProps(el, { onClick: () => { count++; } });
    el.click();
    expect(count).toBe(1);
  });

  test('removes old listener when handler changes', () => {
    const el = document.createElement('button');
    let count = 0;
    __spreadProps(el, { onClick: () => { count++; } });
    el.click();
    expect(count).toBe(1);

    __spreadProps(el, { onClick: () => { count += 10; } });
    el.click();
    expect(count).toBe(11);
  });

  test('removes listener when event is no longer in spread', () => {
    const el = document.createElement('button');
    let count = 0;
    __spreadProps(el, { onClick: () => { count++; } });
    el.click();
    expect(count).toBe(1);

    __spreadProps(el, {});
    el.click();
    expect(count).toBe(1); // no additional click
  });

  test('does not accumulate duplicate listeners', () => {
    const el = document.createElement('button');
    let count = 0;
    __spreadProps(el, { onClick: () => { count++; } });
    __spreadProps(el, { onClick: () => { count++; } });
    __spreadProps(el, { onClick: () => { count++; } });
    el.click();
    expect(count).toBe(1);
  });

  test('handles multiple different events', () => {
    const el = document.createElement('div');
    let clicks = 0;
    let mouses = 0;
    __spreadProps(el, {
      onClick: () => { clicks++; },
      onMouseenter: () => { mouses++; },
    });

    el.click();
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(clicks).toBe(1);
    expect(mouses).toBe(1);

    // Remove one, keep the other
    __spreadProps(el, { onClick: () => { clicks += 10; } });
    el.click();
    el.dispatchEvent(new MouseEvent('mouseenter'));
    expect(clicks).toBe(11);
    expect(mouses).toBe(1); // unchanged
  });

  test('sets classes and attributes alongside events', () => {
    const el = document.createElement('div');
    __spreadProps(el, { class: 'foo', id: 'bar', onClick: () => {} });
    expect(el.className).toBe('foo');
    expect(el.id).toBe('bar');
  });

  test('updates class when spread changes', () => {
    const el = document.createElement('div');
    __spreadProps(el, { class: 'foo' });
    expect(el.className).toBe('foo');

    __spreadProps(el, { class: 'bar' });
    expect(el.className).toBe('bar');
  });
});
