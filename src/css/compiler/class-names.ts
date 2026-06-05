/**
 * @file class-names.ts
 * @description
 * Logic for generating safe, readable, and highly optimized atomic CSS class names
 * from CSS property-value pairs and modifiers (breakpoints, hover state, etc.).
 */

/**
 * Standard abbreviation map for common CSS properties to keep class names short.
 */
export const PROPERTY_MAP: Record<string, string> = {
  // Box Model
  paddingTop: 'pt',
  paddingBottom: 'pb',
  paddingLeft: 'pl',
  paddingRight: 'pr',
  marginTop: 'mt',
  marginBottom: 'mb',
  marginLeft: 'ml',
  marginRight: 'mr',
  width: 'w',
  height: 'h',
  minWidth: 'min-w',
  minHeight: 'min-h',
  maxWidth: 'max-w',
  maxHeight: 'max-h',

  // Layout & Flex/Grid
  display: 'd',
  position: 'pos',
  flexDirection: 'flex-dir',
  flexWrap: 'flex-wrap',
  alignItems: 'items',
  justifyContent: 'justify',
  gridTemplateColumns: 'grid-cols',
  gridTemplateRows: 'grid-rows',
  gap: 'gap',
  rowGap: 'row-gap',
  columnGap: 'col-gap',

  // Typography
  fontSize: 'text',
  fontWeight: 'font',
  lineHeight: 'leading',
  letterSpacing: 'tracking',
  textAlign: 'text-align',

  // Borders & Outline
  borderWidth: 'border-w',
  borderStyle: 'border-s',
  borderColor: 'border-c',
  borderTopWidth: 'bt-w',
  borderTopStyle: 'bt-s',
  borderTopColor: 'bt-c',
  borderBottomWidth: 'bb-w',
  borderBottomStyle: 'bb-s',
  borderBottomColor: 'bb-c',
  borderLeftWidth: 'bl-w',
  borderLeftStyle: 'bl-s',
  borderLeftColor: 'bl-c',
  borderRightWidth: 'br-w',
  borderRightStyle: 'br-s',
  borderRightColor: 'br-c',
  borderTopLeftRadius: 'rounded-tl',
  borderTopRightRadius: 'rounded-tr',
  borderBottomLeftRadius: 'rounded-bl',
  borderBottomRightRadius: 'rounded-br',
  borderRadius: 'rounded',
  outlineWidth: 'outline-w',
  outlineStyle: 'outline-s',
  outlineColor: 'outline-c',
  outlineOffset: 'outline-off',

  // Cosmetics
  background: 'bg',
  backgroundColor: 'bg',
  color: 'text',
  opacity: 'opacity',
  boxShadow: 'shadow',
  textShadow: 'text-shadow',

  // Transitions & Animations
  transition: 'transition',
  transitionDuration: 'duration',
  transitionDelay: 'delay',
  transitionTimingFunction: 'ease',
};

/**
 * Converts camelCase property names to kebab-case, or uses the short abbreviation if available.
 *
 * @example
 * getPropertyKey('paddingLeft') // -> 'pl'
 * getPropertyKey('outlineOffset') // -> 'outline-off'
 * getPropertyKey('zIndex') // -> 'z-index'
 */
export function getPropertyKey(prop: string): string {
  if (PROPERTY_MAP[prop]) return PROPERTY_MAP[prop];
  return prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Converts a typed CSS value (Length, Color, string, number) into its string representation.
 */
export function valueToString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val.toString === 'function') return val.toString();
  return String(val);
}

/**
 * Sanitizes a CSS value string so it can be safely used inside a class name.
 * Replaces spaces, decibels, hashes, percentages, and parentheses.
 *
 * @example
 * sanitizeValue('16px') // -> '16px'
 * sanitizeValue('#2563eb') // -> '2563eb'
 * sanitizeValue('1.5rem') // -> '1_5rem'
 * sanitizeValue('rgb(0, 0, 0)') // -> 'rgb_0_0_0'
 */
export function sanitizeValue(val: string): string {
  return val
    .trim()
    .replace(/\s*([,()]+)\s*/g, '$1')          // Strip spaces around commas and parentheses
    .replace(/#/g, '')                         // Remove colors hash (#fff -> fff)
    .replace(/\./g, '_')                       // Decimals dot to underscore (1.5rem -> 1_5rem)
    .replace(/%/g, 'pct')                      // % to pct (100% -> 100pct)
    .replace(/\+/g, ' ')                       // Replace plus signs in calc with space
    .replace(/\s+/g, '-')                      // Spaces to dashes
    .replace(/[^a-zA-Z0-9_-]/g, '_')           // Replace parenthesis, commas, etc. with _
    .replace(/__+/g, '_')                      // Collapse multiple underscores
    .replace(/--+/g, '-')                      // Collapse multiple dashes
    .replace(/^[-_]+|[-_]+$/g, '');            // Trim leading/trailing dashes and underscores
}

/**
 * Generates an atomic CSS class name for a property-value pair and optional modifier.
 *
 * @example
 * toClassName('paddingLeft', '16px') // -> 'pl_16px'
 * toClassName('background', '#2563eb', 'hover') // -> 'hover:bg_2563eb'
 */
export function toClassName(prop: string, value: any, modifier?: string): string {
  const strVal = valueToString(value);
  if (!strVal) return '';

  const shortProp = getPropertyKey(prop);
  const cleanValue = sanitizeValue(strVal);
  const baseClass = `${shortProp}_${cleanValue}`;

  if (modifier) {
    // Split by single colons, clean colons from parts, and sanitize each part
    const cleanParts = modifier
      .split(/(?<!:):(?!:)/)
      .map((part) => {
        const cleanPart = part.replace(/^:+/, '');
        return sanitizeValue(cleanPart);
      })
      .filter(Boolean);
    return `${cleanParts.join(':')}:${baseClass}`;
  }

  return baseClass;
}
