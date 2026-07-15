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
import { toNode } from '../runtime/dom';
import { isSsrNode } from '../runtime/types';
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
function serializeToHtml(child: MemoChild): string {
  if (child == null || child === false || child === true) return '';
  if (typeof child === 'string') return child;
  if (typeof child === 'number') return String(child);

  if (Array.isArray(child)) {
    return (child as MemoChild[]).map(serializeToHtml).join('');
  }

  if (isSsrNode(child)) {
    const { tag, props, children } = child;

    // Build attribute string — skip internal/React-ish prop names
    const attrs = Object.entries(props ?? {})
      .filter(([k]) => k !== 'children' && k !== 'innerHTML' && k !== 'dangerouslySetInnerHTML')
      .map(([k, v]) => {
        if (v === true) return k;           // boolean attribute
        if (v === false || v == null) return '';
        return `${k}="${String(v).replace(/"/g, '&quot;')}"`;
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
  if (typeof document === 'undefined') {
    // Serialize children to an HTML string and hand them to the provider.
    // The provider stores them in an AsyncLocalStorage scope; the adapter
    // retrieves them after renderToString and injects them into <head>.
    const childArray = Array.isArray(props.children)
      ? props.children
      : props.children != null
        ? [props.children]
        : [];

    const html = childArray.map(serializeToHtml).join('');

    const provider = (globalThis as any).__auwla_headProvider;
    if (provider && typeof provider.addHeadTag === 'function') {
      provider.addHeadTag(html);
    }

    // Return an inert render closure — nothing is rendered into the body.
    return () => null as unknown as MemoChild;
  }

  // ── Client path ───────────────────────────────────────────────────────────

  // Comment node acts as a stable placeholder in the component tree.
  // The real head content lives in document.head, not in the body.
  const placeholder = document.createComment('auwla:head');

  /** Nodes currently hoisted into document.head by this instance. */
  let hoisted: Node[] = [];

  // Remove all hoisted nodes when the component unmounts (e.g. route change).
  cleanup(() => {
    for (const node of hoisted) node.parentNode?.removeChild(node);
    hoisted = [];
  });

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
    for (const node of hoisted) node.parentNode?.removeChild(node);
    hoisted = [];

    // toNode handles TemplateNodes, RenderClosures, DOM Nodes, and primitives.
    const flat = (childArray as MemoChild[]).flat(Infinity) as MemoChild[];
    for (const child of flat) {
      if (child == null || child === false || child === true) continue;
      const node = toNode(child);
      // DocumentFragment — append its children individually so we can track them.
      if (node instanceof DocumentFragment) {
        const nodes = Array.from(node.childNodes);
        for (const n of nodes) {
          document.head.appendChild(n);
          hoisted.push(n);
        }
      } else {
        document.head.appendChild(node);
        hoisted.push(node);
      }
    }

    return placeholder;
  };
}
