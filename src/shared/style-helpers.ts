/**
 * @fileoverview Shared style helpers used by both DOM setters and SSR
 * stringification so unitless/px behavior is consistent on client and server.
 */

/** CSS properties whose numeric values should not receive an automatic `px` suffix. */
export const UNITLESS_STYLES = new Set([
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

/**
 * Convert a compiled style value to its string representation.
 * Non-zero numbers receive a `px` suffix unless the property is unitless.
 */
export function compiledStyleValue(name: string, value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number' && value !== 0 && !UNITLESS_STYLES.has(name)) return `${value}px`;
  return String(value);
}
