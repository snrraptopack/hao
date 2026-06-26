/**
 * @fileoverview Template cloning for compiled static shapes.
 *
 * Compiled row blocks and root blocks clone from a cached `<template>` element
 * instead of calling `document.createElement` per node.
 *
 * During **SSR hydration** the module enters a special cursor mode: instead of
 * stamping out new nodes, `__cloneTemplate` returns the existing server-rendered
 * node at the current cursor position and advances the cursor.  This lets the
 * compiled setup code "grab" real DOM refs without touching the DOM structure.
 */

const templateCache = new Map<string, HTMLTemplateElement>();

/**
 * Pointer to the next server-rendered sibling that the hydration pass should
 * claim.  `null` means we are NOT in hydration mode.
 */
let hydrationCursor: ChildNode | null = null;

/**
 * Enter hydration mode.  Must be called once, right before the first
 * `renderNow()` when an SSR root is detected.
 *
 * @param root - The container element whose children were server-rendered.
 * @internal
 */
export function enterHydration(root: Element): void {
  hydrationCursor = root.firstChild as ChildNode | null;
}

/**
 * Exit hydration mode.  Must be called after the first render pass completes.
 * Subsequent renders (re-renders on state change) use normal cloning.
 * @internal
 */
export function exitHydration(): void {
  hydrationCursor = null;
}

/**
 * Claim the next `<!--auwla:child-->` or `<!--auwla:keyed-map-->` comment
 * from the server-rendered DOM for use as a `__setChild` anchor.
 *
 * In hydration mode, returns the existing comment at the cursor and advances
 * past it.  Outside hydration mode, creates a fresh empty comment.
 *
 * The compiler emits `document.createComment("auwla:child")` in setup code;
 * the Vite plugin replaces that call with `__hydrateComment()` when building
 * a hydration bundle.  For now the runtime always calls this function and it
 * correctly falls back to a new comment when not hydrating.
 * @internal
 */
export function __hydrateComment(data: string): Comment {
  if (hydrationCursor !== null) {
    // Skip pure-whitespace text nodes between tags.
    while (
      hydrationCursor !== null &&
      hydrationCursor.nodeType === Node.TEXT_NODE &&
      hydrationCursor.textContent?.trim() === ''
    ) {
      hydrationCursor = hydrationCursor.nextSibling as ChildNode | null;
    }

    if (
      hydrationCursor !== null &&
      hydrationCursor.nodeType === Node.COMMENT_NODE &&
      (hydrationCursor.textContent === 'auwla:child' ||
        hydrationCursor.textContent === 'auwla:keyed-map')
    ) {
      const openNode = hydrationCursor as Comment;
      const expectedClose = '/' + openNode.textContent;
      
      const hydratedNodes: Node[] = [];
      let current = openNode.nextSibling;
      
      while (current && !(current.nodeType === Node.COMMENT_NODE && current.textContent === expectedClose)) {
        hydratedNodes.push(current);
        current = current.nextSibling;
      }
      
      const closeNode = current as Comment | null;
      
      if (closeNode) {
        hydrationCursor = closeNode.nextSibling as ChildNode | null;
        
        // The closing comment acts as the anchor for future __setChild operations
        const marker = closeNode as any;
        marker.__auwlaChildNodes = hydratedNodes;
        return marker;
      } else {
        hydrationCursor = openNode.nextSibling as ChildNode | null;
        return openNode;
      }
    }
  }
  return document.createComment(data);
}

/**
 * Claim the next element from the server-rendered DOM for use as a node.
 * 
 * In hydration mode, returns the existing element at the cursor and advances
 * past it. Outside hydration mode, creates a fresh element.
 * @internal
 */
export function __hydrateElement(tag: string, isSvg = false): HTMLElement | SVGElement {
  if (hydrationCursor !== null) {
    // Skip pure-whitespace text nodes between tags.
    while (
      hydrationCursor !== null &&
      hydrationCursor.nodeType === Node.TEXT_NODE &&
      hydrationCursor.textContent?.trim() === ''
    ) {
      hydrationCursor = hydrationCursor.nextSibling as ChildNode | null;
    }

    if (
      hydrationCursor !== null &&
      hydrationCursor.nodeType === Node.ELEMENT_NODE &&
      (hydrationCursor as Element).tagName.toLowerCase() === tag.toLowerCase()
    ) {
      const node = hydrationCursor;
      hydrationCursor = hydrationCursor.nextSibling as ChildNode | null;
      return node as HTMLElement | SVGElement;
    }
  }
  
  if (isSvg) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag) as SVGElement;
  }
  return document.createElement(tag);
}

/**
 * Clone an element from a cached HTML template string.
 *
 * In hydration mode, returns the existing server-rendered node at the current
 * cursor position instead of cloning a fresh node.
 * @internal
 */
export function __cloneTemplate(html: string): HTMLElement {
  // Hydration mode: claim the next server-rendered node.
  if (hydrationCursor !== null) {
    // Skip over Text nodes that are pure whitespace (e.g. newlines between tags).
    while (
      hydrationCursor !== null &&
      hydrationCursor.nodeType === Node.TEXT_NODE &&
      hydrationCursor.textContent?.trim() === ''
    ) {
      hydrationCursor = hydrationCursor.nextSibling as ChildNode | null;
    }

    if (hydrationCursor !== null) {
      const node = hydrationCursor;
      hydrationCursor = hydrationCursor.nextSibling as ChildNode | null;
      return node as HTMLElement;
    }
  }

  // Normal mode: clone from a cached <template>.
  let template = templateCache.get(html);
  if (!template) {
    template = document.createElement('template');
    template.innerHTML = html;
    templateCache.set(html, template);
  }

  return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
}
