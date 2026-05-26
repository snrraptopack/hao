/**
 * @fileoverview Direct DOM mutation helpers for compiled output.
 *
 * These functions are called by generated code to patch only the
 * specific sites that can change, avoiding full template rebuilds.
 */

import { toNode } from '../runtime/dom';

/** @internal */
export type StyledElement = HTMLElement & {
  __auwlaStyle?: Record<string, string | number | null | undefined>;
};

/** @internal */
export type ChildMarker = Node & {
  __auwlaChildNodes?: Node[];
};

const UNITLESS_STYLES = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
]);

/** @internal */
export function compiledValue(value: unknown): string {
  return value == null || typeof value === 'boolean' ? '' : String(value);
}

/** @internal */
export function compiledStyleValue(name: string, value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number' && value !== 0 && !UNITLESS_STYLES.has(name)) return `${value}px`;
  return String(value);
}

/** @internal */
export function setCompiledProp(element: HTMLElement, name: string, value: unknown) {
  if (value === false || value === null || value === undefined) {
    if (name in element) {
      try {
        (element as any)[name] = typeof (element as any)[name] === 'boolean' ? false : '';
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    element.removeAttribute(name);
    return;
  }

  if (value === true) {
    element.setAttribute(name, '');
    if (name in element) {
      try {
        (element as any)[name] = true;
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    return;
  }

  if (name in element) {
    try {
      (element as any)[name] = value;
      return;
    } catch {
      // Fall through to attribute assignment for readonly DOM properties.
    }
  }

  element.setAttribute(name, String(value));
}

/** Remove a node from its parent, if attached. */
export function removeNode(node: Node) {
  if (node.parentNode) node.parentNode.removeChild(node);
}

/**
 * Update the text content of a `CharacterData` node (Text or Comment).
 * @internal
 */
export function __setText(node: CharacterData, value: unknown): void {
  const next = compiledValue(value);
  if (node.data !== next) node.data = next;
}

/**
 * Replace the content at a comment-marker child position.
 * @internal
 */
export function __setChild(parent: Node, current: Node, value: unknown): Node {
  const marker = current as ChildMarker;
  const previous = marker.__auwlaChildNodes;

  if (previous) {
    for (const node of previous) removeNode(node);
  }

  if (value === null || value === undefined || value === false || value === true) {
    marker.__auwlaChildNodes = [];
    return marker;
  }

  const next = toNode(value);
  const nodes = next instanceof DocumentFragment ? Array.from(next.childNodes) : [next];
  parent.insertBefore(next, marker);
  marker.__auwlaChildNodes = nodes;
  return marker;
}

/**
 * Update an element's `className` when the value changes.
 * @internal
 */
export function __setClass(element: HTMLElement, value: unknown): void {
  const next = compiledValue(value);
  if (element.className !== next) element.className = next;
}

/**
 * Set a DOM property (e.g. `checked`, `value`, `disabled`).
 * @internal
 */
export function __setProperty(element: HTMLElement, name: string, value: unknown): void {
  setCompiledProp(element, name, value);
}

/**
 * Set a plain HTML attribute.
 * @internal
 */
export function __setAttribute(element: HTMLElement, name: string, value: unknown): void {
  if (value === false || value === null || value === undefined) {
    element.removeAttribute(name);
    return;
  }

  const next = value === true ? '' : String(value);
  if (element.getAttribute(name) !== next) element.setAttribute(name, next);
}

/**
 * Spread a props object onto an element.
 *
 * Used for static spread attributes in compiled output.
 * @internal
 */
export function __spreadProps(element: HTMLElement, props: Record<string, unknown>): void {
  const spreadListeners = ((element as any).__auwlaSpreadListeners ??= new Map()) as Map<string, EventListener>;

  // Remove listeners for events no longer present in the new props
  for (const [key, listener] of spreadListeners) {
    if (key.startsWith('on') && key.length > 2 && !(key in props)) {
      const eventName = key.slice(2).toLowerCase();
      element.removeEventListener(eventName, listener);
      spreadListeners.delete(key);
    }
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key') continue;
    if (key === 'class' || key === 'className') {
      __setClass(element, value);
    } else if (key === 'style') {
      __setStyle(element, value as Record<string, string | number | null | undefined>);
    } else if (key.startsWith('on') && key.length > 2) {
      const eventName = key.slice(2).toLowerCase();
      const previous = spreadListeners.get(key);
      if (previous) {
        element.removeEventListener(eventName, previous);
        spreadListeners.delete(key);
      }
      if (typeof value === 'function') {
        const listener = value as EventListener;
        spreadListeners.set(key, listener);
        element.addEventListener(eventName, listener);
      }
    } else if (key === 'ref' && typeof value === 'function') {
      (value as (el: HTMLElement) => void)(element);
    } else {
      setCompiledProp(element, key, value);
    }
  }
}

/**
 * Update inline styles on an element.
 *
 * Accepts either a single `name, value` pair or an object of styles.
 * @internal
 */
export function __setStyle(
  element: HTMLElement,
  styles: Record<string, string | number | null | undefined>,
): void;
export function __setStyle(
  element: HTMLElement,
  name: keyof CSSStyleDeclaration | string,
  value: string | number | null | undefined,
): void;
export function __setStyle(
  element: HTMLElement,
  nameOrStyles: keyof CSSStyleDeclaration | string | Record<string, string | number | null | undefined>,
  value?: string | number | null | undefined,
): void {
  if (typeof nameOrStyles === 'object' && nameOrStyles !== null) {
    const target = element as StyledElement;
    const oldStyle = target.__auwlaStyle ?? {};
    const nextStyle = nameOrStyles;
    target.__auwlaStyle = nextStyle;

    for (const name of Object.keys(oldStyle)) {
      if (name in nextStyle) continue;
      try {
        (element.style as any)[name] = '';
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }

    for (const name of Object.keys(nextStyle)) {
      const next = compiledStyleValue(name, nextStyle[name]);
      if (Object.is(compiledStyleValue(name, oldStyle[name]), next)) continue;
      try {
        (element.style as any)[name] = next;
      } catch {
        // Ignore invalid/readonly style properties.
      }
    }
    return;
  }

  const name = String(nameOrStyles);
  const next = compiledStyleValue(name, value);
  if ((element.style as any)[name] !== next) {
    try {
      (element.style as any)[name] = next;
    } catch {
      // Ignore invalid/readonly style properties.
    }
  }
}
