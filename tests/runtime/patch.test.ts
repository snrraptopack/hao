import { describe, expect, test } from 'vitest';
import { patchNode, patchChildren, patchRoot } from '../../src/runtime/patch';

describe('patchNode', () => {
  test('updates text node content', () => {
    const parent = document.createElement('div');
    const text = document.createTextNode('old');
    parent.appendChild(text);

    const result = patchNode(parent, text, 'new');
    expect(result).toBe(text);
    expect(text.textContent).toBe('new');
  });

  test('same node reference returns immediately', () => {
    const parent = document.createElement('div');
    const node = document.createElement('span');
    parent.appendChild(node);

    const result = patchNode(parent, node, node);
    expect(result).toBe(node);
  });

  test('replaces incompatible tags', () => {
    const parent = document.createElement('div');
    const oldEl = document.createElement('span');
    parent.appendChild(oldEl);

    const newEl = document.createElement('div');
    const result = patchNode(parent, oldEl, newEl);
    expect(result).toBe(newEl);
    expect(parent.firstChild).toBe(newEl);
  });

  test('replaces text with element', () => {
    const parent = document.createElement('div');
    const text = document.createTextNode('hello');
    parent.appendChild(text);

    const el = document.createElement('span');
    const result = patchNode(parent, text, el);
    expect(result).toBe(el);
    expect(parent.firstChild).toBe(el);
  });

  test('replaces element with text', () => {
    const parent = document.createElement('div');
    const el = document.createElement('span');
    parent.appendChild(el);

    const text = document.createTextNode('hello');
    const result = patchNode(parent, el, text);
    expect(result).toBe(text);
    expect(parent.firstChild).toBe(text);
  });

  test('patches null to empty text', () => {
    const parent = document.createElement('div');
    const text = document.createTextNode('old');
    parent.appendChild(text);

    const result = patchNode(parent, text, null);
    expect(result.textContent).toBe('');
  });
});

describe('patchChildren', () => {
  test('inserts a comment sentinel when children are empty', () => {
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));
    parent.appendChild(document.createTextNode('text'));

    // Previously this cleared the DOM to zero children.
    // Now it replaces the content with a single invisible comment node so the
    // next render always has something to reconcile against (prevents blank-page loops).
    patchChildren(parent, []);
    expect(parent.childNodes.length).toBe(1);
    expect(parent.firstChild!.nodeType).toBe(Node.COMMENT_NODE);
  });

  test('appends to empty parent', () => {
    const parent = document.createElement('div');
    patchChildren(parent, ['a', 'b']);
    expect(parent.textContent).toBe('ab');
  });

  test('updates text in place', () => {
    const parent = document.createElement('div');
    parent.appendChild(document.createTextNode('old'));

    patchChildren(parent, ['new']);
    expect(parent.textContent).toBe('new');
    expect(parent.childNodes.length).toBe(1);
  });

  test('replaces element with different tag', () => {
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));

    patchChildren(parent, [document.createElement('div')]);
    expect(parent.firstChild!.nodeName).toBe('DIV');
  });

  test('removes unused children', () => {
    const parent = document.createElement('div');
    parent.appendChild(document.createElement('span'));
    parent.appendChild(document.createElement('strong'));

    patchChildren(parent, ['text']);
    expect(parent.childNodes.length).toBe(1);
    expect(parent.textContent).toBe('text');
  });

  test('inserts new children at end', () => {
    const parent = document.createElement('div');
    parent.appendChild(document.createTextNode('a'));

    patchChildren(parent, ['a', 'b', 'c']);
    expect(parent.textContent).toBe('abc');
  });

  test('keyed reconciliation reuses elements', () => {
    const parent = document.createElement('div');
    const el1 = document.createElement('span');
    el1.setAttribute('key', '1');
    (el1 as any).__memoKey = '1';
    parent.appendChild(el1);

    const el2 = document.createElement('span');
    el2.setAttribute('key', '2');
    (el2 as any).__memoKey = '2';
    parent.appendChild(el2);

    // Create keyed elements for next children
    const next1 = document.createElement('span');
    (next1 as any).__memoKey = '1';
    const next2 = document.createElement('span');
    (next2 as any).__memoKey = '2';

    patchChildren(parent, [next2, next1]);

    // Elements should be reused but reordered
    const spans = parent.querySelectorAll('span');
    expect(spans.length).toBe(2);
    expect(spans[0]).toBe(el2);
    expect(spans[1]).toBe(el1);
  });

  test('ignores whitespace-only text nodes during reconciliation', () => {
    const parent = document.createElement('div');
    const text = document.createTextNode('content');
    parent.appendChild(text);

    patchChildren(parent, ['content']);
    expect(parent.childNodes.length).toBe(1);
    expect(parent.firstChild).toBe(text);
  });

  test('handles mixed null and real children', () => {
    const parent = document.createElement('div');
    patchChildren(parent, ['a', null, 'b', undefined, false, 'c']);
    expect(parent.textContent).toBe('abc');
  });

  test('handles array children', () => {
    const parent = document.createElement('div');
    patchChildren(parent, [['a', 'b'], 'c']);
    expect(parent.textContent).toBe('abc');
  });
});

describe('patchRoot', () => {
  test('patches root element children', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('old'));

    patchRoot(root, 'new');
    expect(root.textContent).toBe('new');
  });
});
