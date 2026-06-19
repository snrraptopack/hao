/**
 * @fileoverview Server-side rendering helpers for compiled output.
 *
 * These functions are called by code generated with `ssr: true` to
 * produce HTML strings instead of DOM mutations.
 */

import type { SsrNode } from '../runtime/types';
import { isSsrNode } from '../runtime/types';
import { compiledStyleValue } from '../shared/style-helpers';

/** @internal */
export function __ssrBlock(fn: () => string): string {
  return fn();
}


function ssrChildToString(child: unknown): string {
  if (child == null || typeof child === 'boolean') return '';
  if (Array.isArray(child)) {
    return child.map(ssrChildToString).join('');
  }
  if (isSsrNode(child)) {
    return ssrNodeToString(child);
  }
  if (typeof child === 'function') {
    return ssrChildToString((child as () => unknown)());
  }
  return __escapeHtml(child);
}

const BOOLEAN_HTML_ATTRS = new Set([
  'checked',
  'disabled',
  'hidden',
  'multiple',
  'readonly',
  'required',
  'selected',
]);

function ssrPropsToString(props: Record<string, unknown>): string {
  let attrs = '';
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key') continue;
    if (typeof value === 'function') continue;
    if (key === 'ref') continue;

    const name = key === 'className' ? 'class' : key;

    if (name === 'style' && value && typeof value === 'object') {
      const styles: string[] = [];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v == null) continue;
        const cssName = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        styles.push(`${cssName}: ${__escapeHtml(compiledStyleValue(k, v as string | number | null | undefined))}`);
      }
      if (styles.length > 0) {
        attrs += ` style="${styles.join('; ')}"`;
      }
      continue;
    }

    if (BOOLEAN_HTML_ATTRS.has(name)) {
      if (value) attrs += ` ${name}`;
      continue;
    }

    if (value == null) continue;
    attrs += ` ${name}="${__escapeHtml(value)}"`;
  }
  return attrs;
}

function ssrNodeToString(node: SsrNode): string {
  const tag = node.tag;
  const attrs = ssrPropsToString(node.props);
  const children = node.children.map(ssrChildToString).join('');

  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  if (voidTags.has(tag)) {
    return `<${tag}${attrs}>`;
  }

  return `<${tag}${attrs}>${children}</${tag}>`;
}

/**
 * Stringify a value produced by the SSR render path.
 *
 * Called by `renderToString` on the root component output.
 * Does NOT add `<!--auwla:child-->` markers at this level — the root mount
 * is handled by `patchRoot`, not `__setChild`, so no anchor comment is needed.
 *
 * Dynamic child positions INSIDE a compiled template DO need markers; those
 * are injected by the compiler into the SSR template literal directly
 * (a future compiler enhancement).
 * @internal
 */
export function __ssrNode(node: unknown): string {
  if (isSsrNode(node)) {
    return ssrNodeToString(node);
  }
  if (Array.isArray(node)) {
    return node.map(ssrChildToString).join('');
  }
  if (typeof node === 'function') {
    return ssrChildToString(node());
  }
  return __escapeHtml(node);
}

/**
 * Server-side stub for `__keyedMap`.
 *
 * The compiler emits `__ssrKeyedMap` for `.map()` lists in SSR mode.  The
 * actual list is rendered inline by the SSR template literal; this stub
 * wraps the rendered HTML in `<!--auwla:keyed-map-->` markers so the
 * hydration cursor can find the corresponding anchor comment.
 * @internal
 */
export function __ssrKeyedMap(html: string): string {
  return `<!--auwla:keyed-map-->${html}<!--/auwla:keyed-map-->`;
}

/** @internal */
export function __escapeHtml(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
