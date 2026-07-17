/**
 * @fileoverview DOM patching logic.
 *
 * Compares a "next" value (template node, real node, or primitive) against
 * an existing DOM node and mutates the existing node in place whenever
 * possible. Falls back to `replaceChild` when the types are incompatible.
 */

import { runtimeState } from './state';
import type { MemoElement, AuwlaNode } from './types';
import { isRenderClosure, isTemplateNode } from './types';
import { toNode, setProps } from './dom';
import { templateEqual } from './template';
import { placePatchedNodes } from './reconcile';
import { normalizeChildren } from '../shared/normalize';

/** @internal */
function isElement(node: Node): node is MemoElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

/** @internal */
function getKey(node: Node): unknown {
  return isElement(node) ? node.__memoKey : undefined;
}

/** @internal */
function getRenderKey(value: unknown): unknown {
  if (isTemplateNode(value)) return value.key;
  if (value instanceof Node) return getKey(value);
  return undefined;
}

/**
 * Determine whether two real DOM nodes can be patched into each other.
 * @internal
 */
function canPatch(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;
  if (current.nodeType === Node.TEXT_NODE) return true;
  if (!isElement(current) || !isElement(next)) return false;
  // Prevent reusing DOM elements across different component instances
  if ((current as AuwlaNode).__auwlaOwnerId !== (next as AuwlaNode).__auwlaOwnerId) {
      return false;
  }
  return current.tagName === next.tagName && Object.is(getKey(current), getKey(next));
}

/**
 * Determine whether an existing DOM node can be updated to match `next`.
 * @internal
 */
function canPatchTemplate(current: Node, next: unknown): boolean {
  if (isRenderClosure(next)) return canPatchTemplate(current, next());

  if (isTemplateNode(next)) {
    // HTML tagName is uppercase; SVG keeps mixed case (e.g. "clipPath").
    // Accept either form so mixed-case SVG tags patch instead of replaceChild.
    const tag = isElement(current) ? current.tagName : '';
    return isElement(current) && (tag === next.tag || tag.toLowerCase() === next.tag) && Object.is(getKey(current), next.key);
  }

  if (next instanceof Node) return canPatch(current, next);

  return current.nodeType === Node.TEXT_NODE;
}

/**
 * Patch a single existing DOM node to match `next`.
 *
 * @param parent - The parent node that owns `current`.
 * @param current - The existing DOM node.
 * @param next - The desired next value (TemplateNode, Node, or primitive).
 * @returns The node that should occupy this position (usually `current`).
 */
export function patchNode(parent: Node, current: Node, next: unknown): Node {
  if (isRenderClosure(next)) return patchNode(parent, current, next());
  if (current === next) return current;

  if (!canPatchTemplate(current, next)) {
    const replacement = toNode(next);
    parent.replaceChild(replacement, current);
    return replacement;
  }

  if (isTemplateNode(next)) {
    const currentElement = current as MemoElement;
    if (currentElement.__memoTemplate && templateEqual(currentElement.__memoTemplate, next)) {
      currentElement.__memoTemplate = next;
      return currentElement;
    }

    setProps(currentElement, next.props, runtimeState.activeEventWrapper ?? ((handler) => handler), next.ownerId);
    currentElement.__memoKey = next.key;
    patchChildren(currentElement, next.children);
    next.__auwlaDirty = false;
    currentElement.__memoTemplate = next;
    return currentElement;
  }

  if (!(next instanceof Node)) {
    const text = next == null || typeof next === 'boolean' ? '' : String(next);
    if (current.textContent !== text) current.textContent = text;
    return current;
  }

  if (!canPatch(current, next)) {
    parent.replaceChild(next, current);
    return next;
  }

  if (current.nodeType === Node.TEXT_NODE) {
    if (current.textContent !== next.textContent) {
      current.textContent = next.textContent;
    }
    return current;
  }

  const currentElement = current as MemoElement;
  const nextElement = next as MemoElement;
  setProps(currentElement, nextElement.__memoProps ?? {}, runtimeState.activeEventWrapper ?? ((handler) => handler));
  currentElement.__memoKey = nextElement.__memoKey;
  patchChildren(currentElement, Array.from(nextElement.childNodes));
  return currentElement;
}

/**
 * Reconcile the children of `parent` against `nextChildren`.
 *
 * Keyed children are matched by key; unkeyed children are matched in order.
 * After patching, a single LIS pass reorders nodes with minimal DOM moves.
 * @internal
 */
export function patchChildren(parent: Node, nextChildren: unknown[]) {
  nextChildren = normalizeChildren(nextChildren);

  if (nextChildren.length === 0) {
    // Guard: never wipe the DOM entirely when a component returns null/false/undefined.
    //
    // Without this guard the sequence is:
    //   1. Component returns null → nextChildren = []
    //   2. replaceChildren() clears the DOM → inserts nothing
    //   3. Next render: patchChildren sees a whitespace text node → oldChildren = []
    //      (because the whitespace filter removes it) → fresh-append path runs →
    //      toNode(null) creates an empty text node → same blank state repeats.
    //
    // Instead, we keep a single comment sentinel so the DOM always has one child
    // at this position. The comment is invisible to users and survives the
    // whitespace filter in oldChildren (comment nodes pass the `return true` branch).
    const existing = parent.firstChild;
    if (!existing) {
      parent.appendChild(document.createComment(''));
    } else if (existing.nodeType !== Node.COMMENT_NODE) {
      // There was real content before — replace it with the sentinel.
      (parent as Element).replaceChildren(document.createComment(''));
    }
    // If there's already a comment sentinel, nothing to do.
    return;
  }

  const oldChildren = Array.from(parent.childNodes).filter((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return child.textContent?.trim() !== '';
    }
    return true;
  });

  if (oldChildren.length === 0) {
    const fragment = document.createDocumentFragment();
    for (const next of nextChildren) {
      fragment.appendChild(toNode(next));
    }
    parent.appendChild(fragment);
    return;
  }

  const keyedOld = new Map<unknown, Node>();
  const usedOld = new Set<Node>();
  const patchedNodes: Node[] = [];
  let oldCursor = 0;

  for (const child of oldChildren) {
    const key = getKey(child);
    if (key !== undefined) keyedOld.set(key, child);
  }

  for (const next of nextChildren) {
    const key = getRenderKey(next);
    let match: Node | undefined;

    if (key !== undefined) {
      match = keyedOld.get(key);
    } else {
      while (oldCursor < oldChildren.length) {
        const candidate = oldChildren[oldCursor++];
        if (!candidate || usedOld.has(candidate) || getKey(candidate) !== undefined) continue;
        match = candidate;
        break;
      }
    }

    if (match && usedOld.has(match)) match = undefined;

    const patched = match ? patchNode(parent, match, next) : toNode(next);
    usedOld.add(patched);
    patchedNodes.push(patched);
  }

  for (const child of oldChildren) {
    if (!usedOld.has(child) && child.parentNode === parent) {
      child.remove();
    }
  }

  placePatchedNodes(parent, patchedNodes, oldChildren);
}

/**
 * Entry point for patching the root element of an app.
 * @internal
 */
export function patchRoot(root: Element, next: unknown) {
  patchChildren(root, normalizeChildren(next));
}
