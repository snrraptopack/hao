import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __ssrNode, __escapeHtml, h, Fragment } from '../../src';

describe('SSR runtime bailout', () => {
  let originalDocument: typeof globalThis.document;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    ;(globalThis as any).document = originalDocument;
  });

  it('h() returns an SsrNode when document is undefined', () => {
    ;(globalThis as any).document = undefined;
    const node = h('div', { className: 'card' }, 'Hello') as any;

    expect(node.__auwlaSsr).toBe(true);
    expect(node.tag).toBe('div');
    expect(node.props.className).toBe('card');
    expect(node.children).toEqual(['Hello']);
  });

  it('__ssrNode stringifies an SsrNode', () => {
    ;(globalThis as any).document = undefined;
    const node = h('div', { className: 'card' }, 'Hello');

    expect(__ssrNode(node)).toBe('<div class="card">Hello</div>');
  });

  it('__ssrNode escapes text and attribute values', () => {
    ;(globalThis as any).document = undefined;
    const node = h('a', { href: '/x?a=1&b=2' }, '<script>alert(1)</script>');

    expect(__ssrNode(node)).toBe(
      '<a href="/x?a=1&amp;b=2">&lt;script&gt;alert(1)&lt;/script&gt;</a>',
    );
  });

  it('__ssrNode stringifies nested SsrNodes', () => {
    ;(globalThis as any).document = undefined;
    const inner = h('span', null, 'inner');
    const outer = h('div', null, inner);

    expect(__ssrNode(outer)).toBe('<div><span>inner</span></div>');
  });

  it('__ssrNode stringifies boolean attributes', () => {
    ;(globalThis as any).document = undefined;
    const node = h('input', { disabled: true, required: false, type: 'text' });

    expect(__ssrNode(node)).toBe('<input disabled type="text">');
  });

  it('Fragment returns children array on the server', () => {
    ;(globalThis as any).document = undefined;
    const children = Fragment({ children: [h('p', null, 'a'), h('p', null, 'b')] }) as any;

    expect(Array.isArray(children)).toBe(true);
    expect(__ssrNode(children)).toBe('<p>a</p><p>b</p>');
  });

  it('__ssrNode adds px to numeric style values except unitless props', () => {
    ;(globalThis as any).document = undefined;
    const node = h('div', { style: { width: 100, opacity: 0.5, lineHeight: 1.5 } });

    expect(__ssrNode(node)).toBe('<div style="width: 100px; opacity: 0.5; line-height: 1.5"></div>');
  });

  it('__ssrNode handles render closures from components', () => {
    ;(globalThis as any).document = undefined;
    function Card() {
      return () => h('article', null, 'Card content');
    }
    const closure = h(Card, null) as any;

    expect(__ssrNode(closure)).toBe('<article>Card content</article>');
  });
})
