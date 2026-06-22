/**
 * @fileoverview Direct DOM mutation helpers for compiled output.
 *
 * These functions are called by generated code to patch only the
 * specific sites that can change, avoiding full template rebuilds.
 */

import { toNode } from '../runtime/dom';
import { patchNode } from '../runtime/patch';
import { __event } from './events';
import { compiledStyleValue } from '../shared/style-helpers';

/** @internal */
export type StyledElement = HTMLElement & {
  __auwlaStyle?: Record<string, string | number | null | undefined>;
};

/** @internal */
export type ChildMarker = Node & {
  __auwlaChildNodes?: Node[] | (() => Node[]);
};

/** @internal */
export function compiledValue(value: unknown): string {
  return value == null || typeof value === 'boolean' ? '' : String(value);
}

/** @internal */
export { compiledStyleValue } from '../shared/style-helpers';

/** @internal */
export function setCompiledProp(element: HTMLElement, name: string, value: unknown) {
  if (value === false || value === null || value === undefined) {
    if (name in element) {
      try {
        const target = typeof (element as any)[name] === 'boolean' ? false : '';
        if (!Object.is((element as any)[name], target)) {
          (element as any)[name] = target;
        }
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
        if (!Object.is((element as any)[name], true)) {
          (element as any)[name] = true;
        }
      } catch {
        // Ignore readonly DOM properties.
      }
    }
    return;
  }

  if (name in element) {
    try {
      if (!Object.is((element as any)[name], value)) {
        (element as any)[name] = value;
      }
      return;
    } catch {
      // Fall through to attribute assignment for readonly DOM properties.
    }
  }

  const next = String(value);
  if (element.getAttribute(name) !== next) {
    element.setAttribute(name, next);
  }
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
 * Update an element whose content is a single dynamic text expression.
 * Avoids allocating and appending a separate Text node for table/list cells.
 * @internal
 */
export function __setElementText(element: Element, value: unknown): void {
  const next = compiledValue(value);
  if (element.textContent !== next) element.textContent = next;
}

/**
 * Replace the content at a comment-marker child position.
 *
 * The marker itself stays in the DOM as a stable anchor; the actual
 * rendered nodes are tracked in `marker.__auwlaChildNodes`.
 *
 * ### `__auwlaGetNodes` snapshot race
 *
 * When `value` is a keyed-map fragment, `__auwlaGetNodes` is a **live
 * function** over the map's `orderedRows` array. If the map's own
 * `update()` runs before this function gets to remove previous nodes,
 * calling `__auwlaGetNodes` at removal time returns the *post-update*
 * rows — nodes that were just inserted — and removes them immediately.
 *
 * Fix: snapshot the previous node list into a plain `Node[]` the
 * instant `__setChild` is entered, before any DOM mutations. The
 * removal loop then always operates on the pre-update stale set.
 * @internal
 */
export function __setChild(parent: Node, current: Node, value: unknown): Node {
  const marker = current as ChildMarker;
  const previous = marker.__auwlaChildNodes;

  /**
   * Snapshot the previous nodes immediately so that lazy live
   * providers (e.g. `__auwlaGetNodes` on a keyed-map fragment) are
   * evaluated before any DOM mutation takes place.  Without this
   * snapshot a live provider would return post-update nodes if the
   * map had already reconciled by the time the removal pass ran.
   */
  const previousNodes: Node[] | undefined = typeof previous === 'function'
    ? previous()        // evaluate live provider → now a plain snapshot
    : previous;         // already an array or undefined

  if (value === null || value === undefined || value === false || value === true) {
    if (previousNodes) {
      for (const node of previousNodes) removeNode(node);
    }
    marker.__auwlaChildNodes = [];
    return marker;
  }

  const next = toNode(value);
  const nodeProvider = (value as any).__auwlaGetNodes as (() => Node[]) | undefined;
  const nodes = next instanceof DocumentFragment
    ? (nodeProvider ? nodeProvider() : Array.from(next.childNodes))
    : nodeProvider
      ? nodeProvider()
      : [next];

  if (
    previousNodes?.length === 1
    && previousNodes[0]!.parentNode === parent
    && !(value instanceof Node)
    && !(next instanceof DocumentFragment)
  ) {
    // Fallback dynamic children often contain interactive elements. Patch a
    // single existing child in place so focus, selection, and listeners survive.
    const patched = patchNode(parent, previousNodes[0]!, next);
    marker.__auwlaChildNodes = [patched];
    return marker;
  }

  if (previousNodes) {
    for (const node of previousNodes) removeNode(node);
  }

  parent.insertBefore(next, marker);
  marker.__auwlaChildNodes = nodeProvider ?? nodes;
  return marker;
}

/**
 * Update an element's `className` when the value changes.
 * @internal
 */
export function __setClass(element: HTMLElement | SVGElement, value: unknown): void {
  const next = compiledValue(value);
  if (element instanceof SVGElement) {
    if (next) {
      element.setAttribute('class', next);
    } else {
      element.removeAttribute('class');
    }
  } else {
    if (element.className !== next) element.className = next;
  }
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
    } else if (key.startsWith('emit:') && key.length > 5) {
      const eventName = key.slice(5);
      const previous = spreadListeners.get(key);
      if (previous) {
        element.removeEventListener(eventName, previous);
        spreadListeners.delete(key);
      }
      if (typeof value === 'function') {
        const listener = __event((event) => (value as (payload: unknown) => unknown)((event as CustomEvent).detail));
        spreadListeners.set(key, listener);
        element.addEventListener(eventName, listener);
      }
    } else if (key.startsWith('on') && key.length > 2) {
      const eventName = key.slice(2).toLowerCase();
      const previous = spreadListeners.get(key);
      if (previous) {
        element.removeEventListener(eventName, previous);
        spreadListeners.delete(key);
      }
      if (typeof value === 'function') {
        const listener = __event(value as (event: Event) => unknown);
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

/**
 * Extract value from text/number/range inputs and textareas.
 * @internal
 */
export function __updateInput(el: HTMLInputElement | HTMLTextAreaElement): string | number {
  if (el.type === 'number' || el.type === 'range') {
    const val = (el as HTMLInputElement).valueAsNumber;
    return isNaN(val) ? '' : val;
  }
  return el.value;
}

/**
 * Check if a checkbox should be checked based on its bound value.
 * @internal
 */
export function __isCheckboxChecked(current: unknown, value: string): boolean {
  if (Array.isArray(current)) {
    return current.includes(value);
  }
  if (current instanceof Set) {
    return current.has(value);
  }
  return !!current;
}

/**
 * Update a checkbox's bound value (boolean/array/set).
 * @internal
 */
export function __updateCheckbox(current: unknown, checked: boolean, value: string): unknown {
  if (Array.isArray(current)) {
    if (checked) {
      return current.includes(value) ? current : [...current, value];
    } else {
      return current.filter((x) => x !== value);
    }
  }
  if (current instanceof Set) {
    const next = new Set(current);
    if (checked) next.add(value);
    else next.delete(value);
    return next;
  }
  return checked;
}

/**
 * Set the selected options on a single or multiple select element.
 * @internal
 */
export function __setSelectValue(select: HTMLSelectElement, value: unknown): void {
  if (select.multiple && (Array.isArray(value) || value instanceof Set)) {
    const set = value instanceof Set ? value : new Set(value as any);
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i]!;
      opt.selected = set.has(opt.value);
    }
  } else {
    select.value = String(value ?? '');
  }
}

/**
 * Extract selected value(s) from a single or multiple select element.
 * @internal
 */
export function __updateSelect(select: HTMLSelectElement): unknown {
  if (select.multiple) {
    return Array.from(select.selectedOptions).map((opt) => opt.value);
  }
  return select.value;
}

