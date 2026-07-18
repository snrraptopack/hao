/**
 * @fileoverview Head component — declarative document <head> management.
 *
 * Usage:
 *   import { Head } from 'auwla/head'
 *
 *   export default function MyPage() {
 *     return () => (
 *       <div>
 *         <Head>
 *           <title>My Page</title>
 *           <meta name="description" content="My page description" />
 *         </Head>
 *         <main>content</main>
 *       </div>
 *     )
 *   }
 *
 * Behaviour:
 *   - **SSR**   — children are serialised and injected into the HTML <head>
 *                 before the response is sent to the browser.
 *   - **Client** — children are appended to document.head; they are removed
 *                  automatically when the component unmounts (route change).
 *
 * Reactivity:
 *   Auwla mutates the props object in place between re-renders (updateProps),
 *   so the render closure reads `props.children` — not a closed-over copy —
 *   and will always see the latest children passed by the parent.
 */

import { cleanup } from '../runtime/component';
import * as dom from '../runtime/dom';
import { isSsrNode, isTemplateNode } from '../runtime/types';
import type { MemoChild } from '../runtime/types';

// ─── SSR helpers ─────────────────────────────────────────────────────────────

/**
 * HTML void tags that must not have a closing tag.
 * Covers every element that is commonly placed inside <head>.
 */
const VOID_TAGS = new Set([
  'meta', 'link', 'base', 'br', 'hr', 'img',
  'input', 'source', 'track', 'wbr',
]);

/**
 * Minimal HTML serialiser for <head> children.
 * Handles SsrNodes, strings, numbers, and nested arrays.
 * This intentionally covers only what makes semantic sense inside <head>
 * (title, meta, link, script, style, …).
 */
function escapeHtml(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** @internal Exported for regression tests; not part of the public API. */
export function serializeToHtml(child: MemoChild): string {
  if (child == null || child === false || child === true) return '';
  // String children are escaped — they end up raw in the SSR <head> HTML,
  // so unescaped user input (e.g. in <title>) would inject markup (XSS).
  if (typeof child === 'string') return escapeHtml(child);
  if (typeof child === 'number') return String(child);

  if (Array.isArray(child)) {
    return (child as MemoChild[]).map(serializeToHtml).join('');
  }

  // Handle mock DOM text and comment nodes during SSR fallback
  if (child && typeof child === 'object' && 'nodeType' in child) {
    const node = child as any;
    if (node.nodeType === 3) {
      return escapeHtml(node.textContent);
    }
    if (node.nodeType === 8) {
      return `<!--${escapeHtml(node.textContent)}-->`;
    }
  }

  // Elements arrive as SsrNode (compiled __ssrNode output) or TemplateNode
  // (runtime template path under the SSR mock DOM) — both carry
  // tag/props/children and serialize identically. TemplateNode children was
  // previously unhandled, which silently dropped all <Head> content (no head
  // tags ever reached the shell).
  if (isSsrNode(child) || isTemplateNode(child)) {
    const { tag, props, children } = child;

    // Build attribute string — skip internal/React-ish prop names
    const attrs = Object.entries(props ?? {})
      .filter(([k]) => k !== 'children' && k !== 'innerHTML' && k !== 'dangerouslySetInnerHTML' && k !== 'key' && !k.startsWith('__'))
      .map(([k, v]) => {
        if (v === true) return k;           // boolean attribute
        if (v === false || v == null) return '';
        // Escape '&' first (so escape sequences are not double-escaped), then
        // '"' (attribute delimiter) and '<' (tag injection).
        const escaped = String(v)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
        return `${k}="${escaped}"`;
      })
      .filter(Boolean)
      .join(' ');

    const attrStr = attrs ? ` ${attrs}` : '';

    if (VOID_TAGS.has(tag)) return `<${tag}${attrStr}>`;

    // Handle dangerouslySetInnerHTML
    if (props?.dangerouslySetInnerHTML && typeof props.dangerouslySetInnerHTML === 'object') {
      const inner = String((props.dangerouslySetInnerHTML as any).__html ?? '');
      return `<${tag}${attrStr}>${inner}</${tag}>`;
    }

    const inner = (children ?? []).map(serializeToHtml).join('');
    return `<${tag}${attrStr}>${inner}</${tag}>`;
  }

  return '';
}

// ─── Component ───────────────────────────────────────────────────────────────

type HeadProps = {
  children?: MemoChild | MemoChild[];
};

/**
 * Head component — manages document `<head>` tags declaratively.
 *
 * **Important:** do not destructure `props` in the setup scope. The runtime
 * mutates `props` in place between re-renders (`updateProps`), so the render
 * closure must read `props.children` directly to stay reactive.
 */
export function Head(props: HeadProps): () => MemoChild {
  // ── SSR path ──────────────────────────────────────────────────────────────
  if (typeof document === 'undefined' || !document.head) {
    // Serialize children to an HTML string and hand them to the provider.
    // The provider stores them in an AsyncLocalStorage scope; the adapter
    // retrieves them after renderToString and injects them into <head>.
    const childArray = Array.isArray(props.children)
      ? props.children
      : props.children != null
        ? [props.children]
        : [];

    const provider = (globalThis as any).__auwla_headProvider;
    if (provider && typeof provider.addHeadTag === 'function') {
      for (const child of childArray) {
        const html = serializeToHtml(child);
        if (html) {
          provider.addHeadTag(html);
        }
      }
    }

    // Return an inert render closure — nothing is rendered into the body.
    return () => null as unknown as MemoChild;
  }

  // ── Client path ───────────────────────────────────────────────────────────

  // Comment node acts as a stable placeholder in the component tree.
  // The real head content lives in document.head, not in the body.
  const placeholder = document.createComment('auwla:head');

  /** Nodes currently hoisted into document.head by this instance. */
  let hoisted: (Node | { restore(): void })[] = [];

  const cleanupHoisted = () => {
    for (const item of hoisted) {
      if ('restore' in item && typeof item.restore === 'function') {
        item.restore();
      } else {
        (item as Node).parentNode?.removeChild(item as Node);
      }
    }
    hoisted = [];
  };

  // Remove all hoisted nodes when the component unmounts (e.g. route change).
  cleanup(cleanupHoisted);

  return () => {
    // Read props.children here, not from the setup scope closure.
    // Because Auwla's updateProps mutates the props object in place, this
    // always reflects the latest children passed by the parent component.
    const childArray = Array.isArray(props.children)
      ? props.children
      : props.children != null
        ? [props.children]
        : [];

    // Remove previously hoisted nodes before appending the new set.
    cleanupHoisted();

    const hoistNode = (n: Node) => {
      // Deduplicate <title>: replace existing title content instead of appending
      if (n.nodeName.toLowerCase() === 'title') {
        const existing = document.head.querySelector('title');
        if (existing) {
          const oldTitle = existing.textContent;
          const newTitle = n.textContent;
          existing.textContent = newTitle;
          hoisted.push({
            restore() {
              // Stacked-restore guard: only revert when this instance still
              // owns the current value. A newer Head may have replaced it —
              // reverting then would clobber the newer page's title (e.g. on
              // SPA navigation where the old page's Head unmounts after the
              // new page's Head has already hoisted).
              if (existing.textContent === newTitle) {
                existing.textContent = oldTitle;
              }
            }
          });
          return;
        }
      }

      // Deduplicate <meta name="description">: replace content of existing instead of appending
      if (n.nodeName.toLowerCase() === 'meta' && (n as HTMLMetaElement).name === 'description') {
        const existing = document.head.querySelector('meta[name="description"]');
        if (existing) {
          const oldContent = existing.getAttribute('content');
          const newContent = (n as HTMLMetaElement).getAttribute('content') || '';
          existing.setAttribute('content', newContent);
          hoisted.push({
            restore() {
              // Same stacked-restore guard as <title>.
              if (existing.getAttribute('content') !== newContent) return;
              if (oldContent !== null) {
                existing.setAttribute('content', oldContent);
              } else {
                existing.removeAttribute('content');
              }
            }
          });
          return;
        }
      }

      document.head.appendChild(n);
      hoisted.push(n);
    };

    // dom.toNode handles TemplateNodes, RenderClosures, DOM Nodes, and primitives.
    const flat = (childArray as MemoChild[]).flat(Infinity) as MemoChild[];
    for (const child of flat) {
      if (child == null || child === false || child === true) continue;
      const node = dom.toNode(child);
      // DocumentFragment — append its children individually so we can track them.
      if (node instanceof DocumentFragment) {
        const nodes = Array.from(node.childNodes);
        for (const n of nodes) {
          hoistNode(n);
        }
      } else {
        hoistNode(node);
      }
    }

    return placeholder;
  };
}
