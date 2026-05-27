/**
 * @fileoverview Lightweight template descriptors and equality checking.
 *
 * During a render pass, intrinsic elements are represented as `TemplateNode`
 * objects rather than real DOM nodes. This module creates those descriptors
 * and determines whether two descriptors are equivalent (so the patcher can
 * skip work).
 */

import { currentComponentId } from './state';
import type { MemoChild, MemoProps, TemplateNode } from './types';
import { isRenderClosure, isTemplateNode } from './types';
import { normalizeChildren } from '../shared/normalize';

/** Cache for templateEqual to avoid redundant deep comparisons in one render pass. */
const templateEqualCache = new WeakMap<object, WeakMap<object, boolean>>();

/**
 * Shallow-compare two prop objects, ignoring the `children` key.
 * Nested style objects are compared recursively.
 * @internal
 */
export function objectShallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a).filter((key) => key !== 'children');
  const bKeys = Object.keys(b).filter((key) => key !== 'children');
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!(key in b)) return false;
    const av = a[key];
    const bv = b[key];
    if (key === 'style' && av && bv && typeof av === 'object' && typeof bv === 'object') {
      if (!objectShallowEqual(av as Record<string, unknown>, bv as Record<string, unknown>)) return false;
      continue;
    }
    if (!Object.is(av, bv)) return false;
  }

  return true;
}

/**
 * Recursively compare two template descriptors.
 *
 * Returns `true` only when tag, key, props, and every child are identical.
 * Render closures are never considered equal.
 * @internal
 */
export function templateEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (isRenderClosure(a) || isRenderClosure(b)) return false;
  if (!isTemplateNode(a) || !isTemplateNode(b) || b.__auwlaDirty) return false;

  // Check cache first
  let map = templateEqualCache.get(a);
  if (map) {
    const cached = map.get(b);
    if (cached !== undefined) return cached;
  }

  let result = true;

  if (a.tag !== b.tag || !Object.is(a.key, b.key)) {
    result = false;
  } else if (!objectShallowEqual(a.props, b.props)) {
    result = false;
  } else {
    const aChildren = normalizeChildren(a.children, false);
    const bChildren = normalizeChildren(b.children, false);
    if (aChildren.length !== bChildren.length) {
      result = false;
    } else {
      for (let i = 0; i < aChildren.length; i++) {
        if (!templateEqual(aChildren[i], bChildren[i]) && !Object.is(aChildren[i], bChildren[i])) {
          result = false;
          break;
        }
      }
    }
  }

  if (!map) {
    map = new WeakMap();
    templateEqualCache.set(a, map);
  }
  map.set(b, result);
  return result;
}

/**
 * Create a lightweight template descriptor for an intrinsic element.
 *
 * Called by `h()` when a render is active. The real DOM node is created
 * later by `createNodeFromTemplate()`.
 * @internal
 */
export function createTemplateElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: MemoProps,
  children: MemoChild[],
): TemplateNode {
  const normalizedProps = props ?? {};
  const key = 'key' in normalizedProps ? normalizedProps.key : undefined;
  const ownerId = currentComponentId();
  return {
    __auwlaTemplate: true,
    ownerId,
    tag,
    props: normalizedProps,
    children,
    key,
  };
}
