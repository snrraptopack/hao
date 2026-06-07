/**
 * @file shorthands.ts
 * @description
 * Utility functions for expanding CSS shorthand properties into their longhand equivalents.
 *
 * Expanding shorthands (e.g. `padding: "10px 20px"` into individual `paddingTop`, etc.)
 * is critical for an atomic CSS compiler. It ensures:
 * 1. Shorthand overrides work deterministically (e.g. `padding` followed by `paddingLeft` works).
 * 2. High reuse of individual longhand classes (e.g. `pt_10px` can be reused).
 */

/**
 * Expands a 1-to-4 value layout (used by padding, margin, inset) into its four longhand sides.
 *
 * @param prop The base shorthand property name ('padding', 'margin', or 'inset')
 * @param value A single value or an array of 1 to 4 values
 * @returns A record containing the four longhand properties and their values
 */
function expandBoxModel(
  prop: 'padding' | 'margin' | 'inset',
  value: any
): Record<string, any> {
  const values = Array.isArray(value) ? value : [value];

  let top = values[0];
  let right = values[0];
  let bottom = values[0];
  let left = values[0];

  if (values.length === 2) {
    // [vertical, horizontal]
    top = bottom = values[0];
    right = left = values[1];
  } else if (values.length === 3) {
    // [top, horizontal, bottom]
    top = values[0];
    right = left = values[1];
    bottom = values[2];
  } else if (values.length === 4) {
    // [top, right, bottom, left]
    top = values[0];
    right = values[1];
    bottom = values[2];
    left = values[3];
  }

  // Map 'inset' shorthand to top, right, bottom, left directly
  if (prop === 'inset') {
    return { top, right, bottom, left };
  }

  return {
    [`${prop}Top`]: top,
    [`${prop}Right`]: right,
    [`${prop}Bottom`]: bottom,
    [`${prop}Left`]: left,
  };
}

/**
 * Expands border-radius shorthands (1 to 4 values) into four corner properties.
 *
 * @param value A single value or an array of 1 to 4 values
 * @returns A record containing the four longhand corners
 */
function expandBorderRadius(value: any): Record<string, any> {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
    ? value.trim().split(/\s+(?![^(]*\))/)
    : [value];

  let tl = values[0];
  let tr = values[0];
  let br = values[0];
  let bl = values[0];

  if (values.length === 2) {
    tl = br = values[0];
    tr = bl = values[1];
  } else if (values.length === 3) {
    tl = values[0];
    tr = bl = values[1];
    br = values[2];
  } else if (values.length === 4) {
    tl = values[0];
    tr = values[1];
    br = values[2];
    bl = values[3];
  }

  return {
    borderTopLeftRadius: tl,
    borderTopRightRadius: tr,
    borderBottomRightRadius: br,
    borderBottomLeftRadius: bl,
  };
}

/**
 * Expands a border shorthand (like "1px solid red") into width, style, and color components.
 *
 * @param side Prefix for the border (e.g. 'border', 'borderTop')
 * @param value A border descriptor object or raw string
 * @returns A record of border longhands
 */
function expandBorder(side: string, value: any): Record<string, any> {
  const expanded: Record<string, any> = {};

  // If the value is a string, we try to split it into: [width, style, color]
  // We split by spaces that are not inside parentheses (e.g. to preserve rgb(255, 0, 0))
  if (typeof value === 'string') {
    const parts = value.trim().split(/\s+(?![^(]*\))/);
    if (parts.length === 3) {
      expanded[`${side}Width`] = parts[0];
      expanded[`${side}Style`] = parts[1];
      expanded[`${side}Color`] = parts[2];
      return expanded;
    }
  }

  // If the value is a typed Border object (e.g. from css.border(...)),
  // we try to extract its properties if possible, or fall back to string representation
  if (value && typeof value === 'object') {
    // Check if it's a custom Border/Outline object that has direct properties
    const obj = value as Record<string, any>;
    if ('width' in obj || 'style' in obj || 'color' in obj) {
      if (obj.width !== undefined) expanded[`${side}Width`] = obj.width;
      if (obj.style !== undefined) expanded[`${side}Style`] = obj.style;
      if (obj.color !== undefined) expanded[`${side}Color`] = obj.color;
      return expanded;
    }
  }

  expanded[side] = value;
  return expanded;
}

/**
 * Recursively expands all shorthand properties in a StyleObject into longhands.
 *
 * @param style The StyleObject to expand
 * @returns A new object with all shorthands expanded to longhands
 */
export function expandShorthands(style: Record<string, any>): Record<string, any> {
  const expanded: Record<string, any> = {};

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;

    // Check if it is a Flex or Grid descriptor object
    if (
      typeof value === 'object' &&
      value !== null &&
      '_tag' in value &&
      (value._tag === 'Flex' || value._tag === 'Grid') &&
      typeof (value as any).toProperties === 'function'
    ) {
      const layoutProps = (value as any).toProperties();
      Object.assign(expanded, expandShorthands(layoutProps));
      continue;
    }

    if (key === 'padding' || key === 'margin' || key === 'inset') {
      Object.assign(expanded, expandBoxModel(key, value));
    } else if (key === 'borderRadius') {
      Object.assign(expanded, expandBorderRadius(value));
    } else if (
      key === 'border' ||
      key === 'borderTop' ||
      key === 'borderBottom' ||
      key === 'borderLeft' ||
      key === 'borderRight'
    ) {
      Object.assign(expanded, expandBorder(key, value));
    } else if (key === 'outline') {
      Object.assign(expanded, expandBorder('outline', value));
    } else {
      expanded[key] = value;
    }
  }

  return expanded;
}
