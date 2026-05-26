import { describe, expect, test } from 'vitest';
import {
  toNode,
  setProp,
  setProps,
  h,
  Fragment,
} from '../../src/runtime/dom';
import type { MemoElement } from '../../src/runtime/types';

describe('toNode', () => {
  test('passes Node instances through', () => {
    const div = document.createElement('div');
    expect(toNode(div)).toBe(div);
  });

  test('converts strings to text nodes', () => {
    const node = toNode('hello');
    expect(node.nodeType).toBe(Node.TEXT_NODE);
    expect(node.textContent).toBe('hello');
  });

  test('converts numbers to text nodes', () => {
    const node = toNode(42);
    expect(node.textContent).toBe('42');
  });

  test('converts null to empty text node', () => {
    const node = toNode(null);
    expect(node.textContent).toBe('');
  });

  test('converts undefined to empty text node', () => {
    const node = toNode(undefined);
    expect(node.textContent).toBe('');
  });

  test('converts false to empty text node', () => {
    const node = toNode(false);
    expect(node.textContent).toBe('');
  });

  test('converts true to empty text node', () => {
    const node = toNode(true);
    expect(node.textContent).toBe('');
  });

  test('flattens arrays into DocumentFragment', () => {
    const fragment = toNode(['a', null, 'b']) as DocumentFragment;
    expect(fragment.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
    expect(fragment.childNodes.length).toBe(2);
    expect(fragment.textContent).toBe('ab');
  });

  test('evaluates render closures recursively', () => {
    const closure = () => 'hello';
    const node = toNode(closure);
    expect(node.textContent).toBe('hello');
  });
});

describe('setProp', () => {
  function wrapEvent(handler: (event: Event) => unknown) {
    return handler as EventListener;
  }

  test('skips unchanged values', () => {
    const el = document.createElement('div') as MemoElement;
    let called = false;
    const original = el.setAttribute;
    el.setAttribute = () => { called = true; };
    setProp(el, 'data-x', 'same', 'same', wrapEvent);
    expect(called).toBe(false);
    el.setAttribute = original;
  });

  test('calls ref callbacks', () => {
    const el = document.createElement('div') as MemoElement;
    let refEl: HTMLElement | null = null;
    setProp(el, 'ref', (e: HTMLElement) => { refEl = e; }, undefined, wrapEvent);
    expect(refEl).toBe(el);
  });

  test('sets className', () => {
    const el = document.createElement('div') as MemoElement;
    setProp(el, 'className', 'foo', undefined, wrapEvent);
    expect(el.className).toBe('foo');
    setProp(el, 'className', null, 'foo', wrapEvent);
    expect(el.className).toBe('');
  });

  test('sets class', () => {
    const el = document.createElement('div') as MemoElement;
    setProp(el, 'class', 'bar', undefined, wrapEvent);
    expect(el.className).toBe('bar');
  });

  test('sets style object', () => {
    const el = document.createElement('div') as MemoElement;
    setProp(el, 'style', { color: 'red', margin: '8px' }, undefined, wrapEvent);
    expect(el.style.color).toBe('red');
    expect(el.style.margin).toBe('8px');
  });

  test('removes old style properties', () => {
    const el = document.createElement('div') as MemoElement;
    setProp(el, 'style', { color: 'red', display: 'block' }, undefined, wrapEvent);
    setProp(el, 'style', { color: 'green' }, { color: 'red', display: 'block' }, wrapEvent);
    expect(el.style.color).toBe('green');
    expect(el.style.display).toBe('');
  });

  test('adds and updates event listeners', () => {
    const el = document.createElement('button') as MemoElement;
    let count = 0;
    const handler = () => { count++; };

    setProp(el, 'onClick', handler, undefined, wrapEvent);
    el.click();
    expect(count).toBe(1);

    const handler2 = () => { count += 10; };
    setProp(el, 'onClick', handler2, handler, wrapEvent);
    el.click();
    expect(count).toBe(11);

    setProp(el, 'onClick', null, handler2, wrapEvent);
    el.click();
    expect(count).toBe(11); // no additional click
  });

  test('sets boolean true as empty attribute', () => {
    const el = document.createElement('input') as MemoElement;
    setProp(el, 'disabled', true, undefined, wrapEvent);
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.getAttribute('disabled')).toBe('');
  });

  test('removes boolean false and resets property', () => {
    const el = document.createElement('input') as MemoElement;
    setProp(el, 'disabled', true, undefined, wrapEvent);
    setProp(el, 'disabled', false, true, wrapEvent);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  test('sets DOM properties directly', () => {
    const el = document.createElement('input') as MemoElement;
    setProp(el, 'value', 'hello', undefined, wrapEvent);
    expect(el.value).toBe('hello');
  });

  test('falls back to setAttribute for unknown attributes', () => {
    const el = document.createElement('div') as MemoElement;
    setProp(el, 'data-custom', 'xyz', undefined, wrapEvent);
    expect(el.getAttribute('data-custom')).toBe('xyz');
  });
});

describe('setProps', () => {
  function wrapEvent(handler: (event: Event) => unknown) {
    return handler as EventListener;
  }

  test('applies multiple props', () => {
    const el = document.createElement('div') as MemoElement;
    setProps(el, { className: 'foo', id: 'bar' }, wrapEvent);
    expect(el.className).toBe('foo');
    expect(el.id).toBe('bar');
  });

  test('removes stale props', () => {
    const el = document.createElement('div') as MemoElement;
    setProps(el, { className: 'foo', id: 'bar' }, wrapEvent);
    setProps(el, { className: 'foo' }, wrapEvent);
    expect(el.className).toBe('foo');
    expect(el.hasAttribute('id')).toBe(false);
  });

  test('updates changed props', () => {
    const el = document.createElement('div') as MemoElement;
    setProps(el, { className: 'foo' }, wrapEvent);
    setProps(el, { className: 'bar' }, wrapEvent);
    expect(el.className).toBe('bar');
  });

  test('skips children and key', () => {
    const el = document.createElement('div') as MemoElement;
    setProps(el, { className: 'foo', children: 'text', key: '1' }, wrapEvent);
    expect(el.className).toBe('foo');
    expect(el.hasAttribute('children')).toBe(false);
    expect(el.hasAttribute('key')).toBe(false);
  });
});

describe('Fragment', () => {
  test('returns DocumentFragment with children', () => {
    const fragment = Fragment({ children: ['a', 'b', 'c'] });
    expect(fragment.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
    expect(fragment.textContent).toBe('abc');
  });

  test('handles single child', () => {
    const fragment = Fragment({ children: 'hello' });
    expect(fragment.textContent).toBe('hello');
  });

  test('filters null and boolean children', () => {
    const fragment = Fragment({ children: ['a', null, false, 'b'] });
    expect(fragment.textContent).toBe('ab');
  });
});
