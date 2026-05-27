/**
 * @fileoverview DOM creation and JSX factory functions.
 *
 * This module turns Auwla's child values (strings, nodes, closures,
 * templates, arrays) into real DOM nodes, and implements the `h()`
 * factory used by the JSX runtime.
 */

import { runtimeState, currentComponentId, registerComponentHost } from './state';
import type {
  EventHandler,
  EventWrapper,
  MemoChild,
  MemoElement,
  MemoProps,
  RenderClosure,
  TemplateNode,
} from './types';
import { isRenderClosure, isTemplateNode } from './types';
import { createTemplateElement } from './template';
import { createComponentClosure } from './component';


/**
 * Convert any Auwla child value into a real DOM `Node`.
 *
 * - `Node` instances pass through.
 * - Render closures are evaluated recursively.
 * - Template nodes are inflated into real elements.
 * - Arrays are flattened into a `DocumentFragment`.
 * - Primitives become text nodes.
 */
export function toNode(child: unknown): Node {
  if (child instanceof Node) return child;

  if (isRenderClosure(child)) {
    return toNode(child());
  }

  if (isTemplateNode(child)) {
    return createNodeFromTemplate(child);
  }

  if (Array.isArray(child)) {
    const fragment = document.createDocumentFragment();
    for (const item of child.flat(Infinity)) {
      if (item === null || item === undefined || item === false || item === true) continue;
      fragment.appendChild(toNode(item));
    }
    return fragment;
  }

  return document.createTextNode(child == null || typeof child === 'boolean' ? '' : String(child));
}

/**
 * Inflate a lightweight `TemplateNode` into a real DOM element.
 * @internal
 */
function createNodeFromTemplate(template: TemplateNode): Node {
  const node = createMemoElement(
    template.tag,
    template.props,
    template.children,
    runtimeState.activeEventWrapper ?? ((handler) => handler),
    template.ownerId,
  ) as MemoElement;
  registerComponentHost(template.ownerId, node);
  template.__auwlaDirty = false;
  node.__memoTemplate = template;
  return node;
}

/**
 * Create a real DOM element with props, events, and children applied.
 *
 * This is the runtime fallback when JSX is not compiled. It is also
 * used internally to inflate template descriptors.
 */
export function createMemoElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: MemoProps,
  children: MemoChild[],
  wrapEvent: EventWrapper = runtimeState.activeEventWrapper ?? ((handler) => handler),
  ownerId: string | null = currentComponentId(),
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag) as MemoElement;
  const appliedProps: Record<string, unknown> = {};
  registerComponentHost(ownerId, element);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue;
      if (key === 'key') {
        element.__memoKey = value;
        continue;
      }

      appliedProps[key] = value;
      setProp(element, key, value, undefined, (handler) => wrapEvent(handler, ownerId));
    }
  }

  element.__memoProps = appliedProps;

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    element.appendChild(toNode(child));
  }

  return element as HTMLElementTagNameMap[K];
}

/**
 * Apply a single prop/attribute/event to an element.
 *
 * This is the canonical setter used both during initial element creation
 * and during patching. It handles ref callbacks, className, inline styles,
 * event listeners, boolean attributes, and DOM properties.
 * @internal
 */
export function setProp(
  element: MemoElement,
  key: string,
  value: unknown,
  oldValue: unknown,
  wrapEvent: (handler: EventHandler) => EventListener,
) {
  if (Object.is(value, oldValue)) return;

  if (key === 'ref' && typeof value === 'function') {
    (value as (el: HTMLElement) => void)(element);
    return;
  }

  if (key === 'className' || key === 'class') {
    element.className = value == null ? '' : String(value);
    return;
  }

  if (key === 'style' && value && typeof value === 'object') {
    const nextStyle = value as Record<string, string | number | null | undefined>;
    const oldStyle = oldValue && typeof oldValue === 'object'
      ? oldValue as Record<string, string | number | null | undefined>
      : {};

    for (const name of Object.keys(oldStyle)) {
      if (name in nextStyle) continue;
      try {
        (element.style as any)[name] = '';
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }

    for (const name of Object.keys(nextStyle)) {
      const next = nextStyle[name];
      const old = oldStyle[name];
      if (Object.is(next, old)) continue;
      try {
        (element.style as any)[name] = next == null ? '' : String(next);
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }
    return;
  }

  const customEventName = key.startsWith('on:') && key.length > 3 ? key.slice(3) : null;
  if (customEventName) {
    const listeners = element.__memoListeners ??= new Map();
    const previous = listeners.get(key);
    if (previous) {
      element.removeEventListener(customEventName, previous);
      listeners.delete(key);
    }

    if (typeof value === 'function') {
      const listener = wrapEvent((event) => (value as (payload: unknown) => unknown)((event as CustomEvent).detail));
      listeners.set(key, listener);
      element.addEventListener(customEventName, listener);
    }
    return;
  }

  const eventName = key.startsWith('on') && key.length > 2 ? key.slice(2).toLowerCase() : null;
  if (eventName) {
    const listeners = element.__memoListeners ??= new Map();
    const previous = listeners.get(key);
    if (previous) {
      element.removeEventListener(eventName, previous);
      listeners.delete(key);
    }

    if (typeof value === 'function') {
      const listener = wrapEvent(value as EventHandler);
      listeners.set(key, listener);
      element.addEventListener(eventName, listener);
    }
    return;
  }

  if (value === false || value === null || value === undefined) {
    if (key in element) {
      try {
        const target = typeof (element as any)[key] === 'boolean' ? false : '';
        // DOM property setters can affect live editing state; avoid them when
        // the property already has the value we need.
        if (!Object.is((element as any)[key], target)) {
          (element as any)[key] = target;
        }
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    element.removeAttribute(key);
    return;
  }

  if (value === true) {
    element.setAttribute(key, '');
    if (key in element) {
      try {
        if (!Object.is((element as any)[key], true)) {
          (element as any)[key] = true;
        }
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    return;
  }

  if (key in element) {
    try {
      if (!Object.is((element as any)[key], value)) {
        (element as any)[key] = value;
      }
      return;
    } catch {
      // Fall through to attribute assignment for readonly DOM properties.
    }
  }

  element.setAttribute(key, String(value));
}

/**
 * Batch-apply props to an element, removing stale props and adding new ones.
 * @internal
 */
export function setProps(
  element: MemoElement,
  nextProps: Record<string, unknown>,
  wrapEvent: EventWrapper,
  ownerId: string | null = null,
) {
  const previousProps = element.__memoProps ?? {};

  for (const key of Object.keys(previousProps)) {
    if (key === 'children' || key === 'key') continue;
    if (!(key in nextProps)) setProp(element, key, undefined, previousProps[key], wrapEvent);
  }

  for (const key of Object.keys(nextProps)) {
    if (key === 'children' || key === 'key') continue;
    setProp(element, key, nextProps[key], previousProps[key], (handler) => wrapEvent(handler, ownerId));
  }

  element.__memoProps = nextProps;
}

/**
 * JSX factory function. Used by the automatic JSX runtime.
 *
 * - Function types create a component closure.
 * - During an active render, intrinsic tags produce a `TemplateNode`.
 * - Outside a render, intrinsic tags create a real DOM element immediately.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  type: K,
  props?: MemoProps,
  ...children: MemoChild[]
): HTMLElementTagNameMap[K];
export function h<P extends Record<string, unknown>>(
  type: (props: P & { children?: MemoChild | MemoChild[] }) => MemoChild | RenderClosure,
  props?: P | null,
  ...children: MemoChild[]
): Node | RenderClosure;
export function h(type: any, props?: MemoProps, ...children: MemoChild[]): MemoChild {
  if (typeof type === 'function') {
    return createComponentClosure(type, props, children);
  }

  if (runtimeState.activeRenderState) {
    return createTemplateElement(type, props, children);
  }

  return createMemoElement(type, props, children);
}

/**
 * JSX fragment factory. Flattens children into a `DocumentFragment`.
 */
export function Fragment(props: { children?: MemoChild | MemoChild[] } = {}): DocumentFragment {
  return toNode(Array.isArray(props.children) ? props.children : [props.children]) as DocumentFragment;
}
