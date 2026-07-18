/**
 * Regression tests for S3 — SSR head XSS (src/head/Head.tsx serializeToHtml).
 * String children and attribute values must be HTML-escaped so user input
 * rendered into <head> cannot inject markup.
 */
import { describe, expect, test } from 'vitest';
// @ts-expect-error internal export for tests
import { serializeToHtml } from '../../src/head/Head';
import type { SsrNode } from '../../src/runtime/types';

function ssr(tag: string, props: Record<string, unknown>, ...children: unknown[]): SsrNode {
  return { __auwlaSsr: true, tag, props, children } as SsrNode;
}

describe('S3 — SSR head serialization escapes user input', () => {
  test('string children are escaped (tag injection via <title>)', () => {
    const evil = '</title><script>alert(1)</script>';
    const html = serializeToHtml(ssr('title', {}, evil) as any);
    expect(html).not.toContain('<script>');
    expect(html).toBe('<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>');
  });

  test('raw strings at any nesting level are escaped', () => {
    expect(serializeToHtml('<img src=x onerror=alert(1)>' as any)).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(serializeToHtml(['<b>', 'x'] as any)).toBe('&lt;b&gt;x');
  });

  test('attribute values escape &, ", and < (event-handler injection)', () => {
    const html = serializeToHtml(
      ssr('meta', { content: '" onmouseover="alert(1)', name: 'a & b' }) as any,
    );
    expect(html).not.toMatch(/" onmouseover="/);
    expect(html).toContain('content="&quot; onmouseover=&quot;alert(1)"');
    expect(html).toContain('name="a &amp; b"');
  });

  test('attribute values with < cannot break out of the tag', () => {
    const html = serializeToHtml(
      ssr('link', { href: 'https://x.test/<script>' }) as any,
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('href="https://x.test/&lt;script>"');
  });

  test('legit markup structure is preserved', () => {
    const html = serializeToHtml(
      ssr('meta', { name: 'description', content: 'Tom & Jerry' }) as any,
    );
    expect(html).toBe('<meta name="description" content="Tom &amp; Jerry">');
  });
});

describe('head SSR collection — TemplateNode children (site regression)', () => {
  // @vitest-environment node is required so the SSR mock DOM path runs —
  // that is where children arrive as TemplateNodes instead of SsrNodes.
  test('serializeToHtml handles TemplateNode children', async () => {
    const { serializeToHtml } = await import('../../src/head/Head');
    const { h } = await import('../../src');

    const templateChild = { __auwlaTemplate: true, ownerId: null, tag: 'title', props: {}, children: ['Hello'] };
    expect(serializeToHtml(templateChild as any)).toBe('<title>Hello</title>');

    const meta = { __auwlaTemplate: true, ownerId: null, tag: 'meta', props: { name: 'x', content: 'y' }, children: [] };
    expect(serializeToHtml(meta as any)).toBe('<meta name="x" content="y">');
  });
});
