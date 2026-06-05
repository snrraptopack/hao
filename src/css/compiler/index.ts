/**
 * @file index.ts
 * @description
 * Main entry point for the Auwla CSS Compiler.
 *
 * Provides the core `compileStyle` engine which converts StyleObjects
 * (including responsive properties and interactive state blocks) into
 * a list of class names and their corresponding CSS rules.
 */

import { expandShorthands } from './shorthands';
import { toClassName, getPropertyKey, valueToString } from './class-names';

export { expandShorthands } from './shorthands';
export { toClassName, PROPERTY_MAP, getPropertyKey, sanitizeValue, valueToString } from './class-names';

/** Standard responsive breakpoints map */
export const BREAKPOINTS: Record<string, string> = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export interface CSSRule {
  className: string;
  selector: string;
  property: string;
  value: string;
  declaration: string; // The full CSS rule block: e.g. ".hover\:bg_2563eb:hover { background-color: #2563eb; }"
  mediaQuery?: string; // Optional media query wrapper: e.g. "min-width: 768px"
}

export interface CompiledStyles {
  classes: string[];
  rules: CSSRule[];
}

/**
 * Escapes the colon character in a CSS selector class name.
 * e.g., "hover:bg_2563eb" -> "hover\:bg_2563eb"
 */
function escapeClassName(className: string): string {
  return className.replace(/:/g, '\\:');
}

/**
 * Helper function to convert a CamelCase JS property name (like 'backgroundColor')
 * to standard CSS property name (like 'background-color').
 */
function toCSSProperty(prop: string): string {
  return prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Compiles a StyleObject into atomic class names and CSS rules.
 * Handles shorthand expansion, responsive objects, and pseudo-class blocks.
 *
 * @param style The raw StyleObject containing CSS values
 * @param outerModifier Optional prefix modifier inherited from nesting (e.g. 'hover')
 * @returns An object containing the generated classes and detailed CSS rules
 */
export function compileStyle(
  style: Record<string, any>,
  outerModifier?: string
): CompiledStyles {
  const classes: string[] = [];
  const rules: CSSRule[] = [];

  // 1. Expand shorthands to longhands first
  const expandedStyle = expandShorthands(style);

  // 2. Iterate through all properties in the style object
  for (const [key, value] of Object.entries(expandedStyle)) {
    if (value === null || value === undefined) continue;

    // Check if it's a pseudo-class block (starts with ':')
    if (key.startsWith(':')) {
      const colonMatch = key.match(/^:+/);
      const colonPrefix = colonMatch ? colonMatch[0] : ':';
      const stateName = key.slice(colonPrefix.length);
      const subModifier = outerModifier
        ? `${outerModifier}:${colonPrefix === '::' ? '::' : ''}${stateName}`
        : `${colonPrefix === '::' ? '::' : ''}${stateName}`;

      const subResult = compileStyle(value, subModifier);
      classes.push(...subResult.classes);
      rules.push(...subResult.rules);
      continue;
    }

    // Check if it's a responsive value object (e.g., { base: '16px', md: '24px' })
    if (
      typeof value === 'object' &&
      value !== null &&
      !('_tag' in value) && // Not a branded value (Length, Color, etc.)
      !Array.isArray(value)
    ) {
      for (const [bp, bpVal] of Object.entries(value)) {
        if (bpVal === null || bpVal === undefined) continue;

        // Prevent nesting of objects inside responsive objects
        if (
          typeof bpVal === 'object' &&
          bpVal !== null &&
          !('_tag' in bpVal) &&
          !Array.isArray(bpVal)
        ) {
          throw new Error(
            `Auwla CSS Compiler: Invalid nested object detected under responsive key "${bp}" for property "${key}". ` +
            `Responsive values must be flat (e.g., base, md, lg).`
          );
        }

        const isBase = bp === 'base';
        const bpModifier = isBase ? undefined : bp;
        const finalModifier = outerModifier
          ? bpModifier
            ? `${bpModifier}:${outerModifier}`
            : outerModifier
          : bpModifier;

        const subResult = compileProperty(key, bpVal, finalModifier);
        if (subResult) {
          classes.push(subResult.className);
          rules.push(subResult.rule);
        }
      }
      continue;
    }

    // Standard single property-value pair
    const subResult = compileProperty(key, value, outerModifier);
    if (subResult) {
      classes.push(subResult.className);
      rules.push(subResult.rule);
    }
  }

  return { classes, rules };
}

/**
 * Compiles a single CSS property-value pair with modifiers into a class name and CSS rule.
 */
function compileProperty(
  prop: string,
  value: any,
  modifier?: string
): { className: string; rule: CSSRule } | null {
  const className = toClassName(prop, value, modifier);
  if (!className) return null;

  const strVal = valueToString(value);
  const cssProp = toCSSProperty(prop);

  // Construct the CSS selector with proper escaping
  let escapedClass = escapeClassName(className);
  let selector = `.${escapedClass}`;
  let mediaQuery: string | undefined;

  if (modifier) {
    // Split by single colons, ignoring double colons (pseudo-elements)
    const parts = modifier.split(/(?<!:):(?!:)/);
    let pseudoSuffix = '';

    for (const part of parts) {
      if (BREAKPOINTS[part]) {
        mediaQuery = `min-width: ${BREAKPOINTS[part]}`;
      } else {
        if (part.startsWith('::')) {
          pseudoSuffix += part;
        } else if (part.startsWith(':')) {
          pseudoSuffix += part;
        } else {
          pseudoSuffix += `:${part}`;
        }
      }
    }

    selector += pseudoSuffix;
  }

  const declaration = `${selector} { ${cssProp}: ${strVal}; }`;

  const rule: CSSRule = {
    className,
    selector,
    property: cssProp,
    value: strVal,
    declaration,
  };

  if (mediaQuery) {
    rule.mediaQuery = mediaQuery;
  }

  return { className, rule };
}
