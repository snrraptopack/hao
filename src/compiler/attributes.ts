/**
 * @fileoverview Attribute compilation for the Auwla compiler.
 */

import ts from 'typescript';
import { DynamicPatch, CompileContext, TemplateContext, TemplatePatch, PROPERTY_PROPS } from './types';
import { expressionText, stringLiteral, escapeHtml, isStaticExpression, childExpression } from './utils';

/** Convert a camelCase CSS property name to kebab-case. */
function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Style properties that are unitless (no 'px' suffix for numbers). */
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

/** Convert a static style object literal to an inline CSS string. */
function staticStyleToCss(
  source: ts.SourceFile,
  expression: ts.ObjectLiteralExpression,
): string | null {
  const styles: string[] = [];

  for (const property of expression.properties) {
    const propertyName = ts.isShorthandPropertyAssignment(property)
      ? property.name.text
      : ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ? property.name.text
        : null;
    if (!propertyName) return null;

    const initializer = ts.isPropertyAssignment(property) ? property.initializer : null;
    const propertyValue = ts.isShorthandPropertyAssignment(property)
      ? property.name.text
      : initializer
        ? ts.isStringLiteralLike(initializer)
          ? initializer.text
          : expressionText(source, initializer)
        : null;
    if (!propertyValue) return null;

    // Only static values can be baked into template HTML
    if (!initializer || !isStaticExpression(initializer)) return null;

    const cssName = camelToKebab(propertyName);
    const cssValue = ts.isNumericLiteral(initializer) && !UNITLESS_STYLES.has(propertyName)
      ? `${propertyValue}px`
      : propertyValue;
    styles.push(`${cssName}: ${cssValue}`);
  }

  return styles.join('; ');
}

/** Map React camelCase attribute names to their HTML equivalents. */
function normalizeAttributeName(name: string): string {
  switch (name) {
    case 'className': return 'class';
    case 'htmlFor': return 'for';
    case 'tabIndex': return 'tabindex';
    case 'readOnly': return 'readonly';
    case 'autoComplete': return 'autocomplete';
    case 'autoFocus': return 'autofocus';
    case 'contentEditable': return 'contenteditable';
    case 'crossOrigin': return 'crossorigin';
    case 'dateTime': return 'datetime';
    case 'encType': return 'enctype';
    case 'srcSet': return 'srcset';
    case 'spellCheck': return 'spellcheck';
    case 'useMap': return 'usemap';
    case 'frameBorder': return 'frameborder';
    case 'cellPadding': return 'cellpadding';
    case 'cellSpacing': return 'cellspacing';
    case 'colSpan': return 'colspan';
    case 'rowSpan': return 'rowspan';
    case 'noWrap': return 'nowrap';
    case 'bgColor': return 'bgcolor';
    case 'textLength': return 'textlength';
    case 'charSet': return 'charset';
    case 'httpEquiv': return 'httpequiv';
    case 'formAction': return 'formaction';
    case 'formEncType': return 'formenctype';
    case 'formMethod': return 'formmethod';
    case 'formNoValidate': return 'formnovalidate';
    case 'formTarget': return 'formtarget';
    case 'inputMode': return 'inputmode';
    case 'isMap': return 'ismap';
    case 'minLength': return 'minlength';
    case 'playsInline': return 'playsinline';
    case 'radioGroup': return 'radiogroup';
    case 'referrerPolicy': return 'referrerpolicy';
    default: return name;
  }
}

function jsxAttributeName(name: ts.JsxAttributeName): string | null {
  if (ts.isIdentifier(name)) return normalizeAttributeName(name.text);
  if (ts.isJsxNamespacedName(name)) return `${name.namespace.text}:${name.name.text}`;
  return null;
}

export function compileAttribute(
  ctx: CompileContext,
  elementVar: string,
  attribute: ts.JsxAttributeLike,
): boolean {
  if (ts.isJsxSpreadAttribute(attribute)) {
    const value = expressionText(ctx.source, attribute.expression);
    ctx.deps.push(value);
    ctx.patches.push({ code: `__spreadProps(${elementVar}, ${value});`, deps: [value] });
    return true;
  }

  const name = jsxAttributeName(attribute.name);
  if (!name) return false;
  const initializer = attribute.initializer;

  if (name === 'key') return true;

  if (name === 'ref') {
    if (!initializer) return true;
    if (!ts.isJsxExpression(initializer)) return false;
    const expression = childExpression(initializer);
    if (!expression) return true;
    const value = expressionText(ctx.source, expression);
    ctx.setup.push(`(${value})(${elementVar});`);
    return true;
  }

  if (!initializer) {
    ctx.setup.push(`__setAttribute(${elementVar}, ${stringLiteral(name)}, true);`);
    return true;
  }

  if (ts.isStringLiteral(initializer)) {
    if (name === 'class') {
      ctx.setup.push(`${elementVar}.className = ${stringLiteral(initializer.text)};`);
      return true;
    }

    ctx.setup.push(`${elementVar}.setAttribute(${stringLiteral(name)}, ${stringLiteral(initializer.text)});`);
    return true;
  }

  if (!ts.isJsxExpression(initializer)) return false;
  const expression = childExpression(initializer);
  if (!expression) return true;

  const value = expressionText(ctx.source, expression);
  if (name === 'style') {
    if (ts.isObjectLiteralExpression(expression)) {
      for (const property of expression.properties) {
        const propertyName = ts.isShorthandPropertyAssignment(property)
          ? property.name.text
          : ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
            ? property.name.text
            : null;
        if (!propertyName) return false;

        const initializer = ts.isPropertyAssignment(property) ? property.initializer : null;
        const propertyValue = ts.isShorthandPropertyAssignment(property)
          ? property.name.text
          : initializer
            ? expressionText(ctx.source, initializer)
            : null;
        if (!propertyValue) return false;

        if (initializer && isStaticExpression(initializer)) {
          ctx.setup.push(`__setStyle(${elementVar}, ${stringLiteral(propertyName)}, ${propertyValue});`);
        } else {
          ctx.deps.push(propertyValue);
          ctx.patches.push({
            code: `__setStyle(${elementVar}, ${stringLiteral(propertyName)}, ${propertyValue});`,
            deps: [propertyValue],
          });
        }
      }
      return true;
    }

    ctx.deps.push(value);
    ctx.patches.push({ code: `__setStyle(${elementVar}, ${value});`, deps: [value] });
    return true;
  }

  if (name === 'class') {
    ctx.deps.push(value);
    ctx.patches.push({ code: `__setClass(${elementVar}, ${value});`, deps: [value] });
    return true;
  }

  if (name.startsWith('on') && name.length > 2) {
    if (name.startsWith('on:')) {
      if (!initializer || !ts.isJsxExpression(initializer)) return false;
      const expression = childExpression(initializer);
      if (!expression) return true;
      const value = expressionText(ctx.source, expression);
      const eventName = name.slice(3);
      ctx.setup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event((event) => (${value})((event as CustomEvent).detail)));`);
      return true;
    }

    const eventName = name.slice(2).toLowerCase();
    ctx.setup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event(${value}));`);
    return true;
  }

  const setter = PROPERTY_PROPS.has(name) ? '__setProperty' : '__setAttribute';
  ctx.deps.push(value);
  ctx.patches.push({ code: `${setter}(${elementVar}, ${stringLiteral(name)}, ${value});`, deps: [value] });
  return true;
}

export function compileTemplateAttribute(
  ctx: TemplateContext,
  attribute: ts.JsxAttributeLike,
  elementVar: string,
): string | null {
  if (ts.isJsxSpreadAttribute(attribute)) {
    const value = expressionText(ctx.source, attribute.expression);
    ctx.deps.push(value);
    ctx.patches.push({ code: `__spreadProps(${elementVar}, ${value});`, deps: [value] });
    return '';
  }
  const name = jsxAttributeName(attribute.name);
  if (!name) return null;

  const initializer = attribute.initializer;
  if (name === 'key') return '';

  if (name === 'ref') {
    if (!initializer) return '';
    if (!ts.isJsxExpression(initializer)) return null;
    const expression = childExpression(initializer);
    if (!expression) return '';
    const value = expressionText(ctx.source, expression);
    ctx.elementSetup.push(`(${value})(${elementVar});`);
    return '';
  }
  if (!initializer) return ` ${name}`;

  if (ts.isStringLiteral(initializer)) {
    return name === 'class'
      ? ` class="${escapeHtml(initializer.text)}"`
      : ` ${name}="${escapeHtml(initializer.text)}"`;
  }

  if (!ts.isJsxExpression(initializer)) return null;
  const expression = childExpression(initializer);
  if (!expression) return '';

  const value = expressionText(ctx.source, expression);
  if (name === 'style') {
    if (ts.isObjectLiteralExpression(expression)) {
      const css = staticStyleToCss(ctx.source, expression);
      if (css !== null) return ` style="${escapeHtml(css)}"`;
    }
    return null;
  }

  if (name === 'class') {
    ctx.deps.push(value);
    ctx.patches.push({ code: `__setClass(${elementVar}, ${value});`, deps: [value] });
    return '';
  }

  if (name.startsWith('on') && name.length > 2) {
    if (name.startsWith('on:')) {
      if (!initializer || !ts.isJsxExpression(initializer)) return null;
      const expression = childExpression(initializer);
      if (!expression) return '';
      const value = expressionText(ctx.source, expression);
      const eventName = name.slice(3);
      ctx.elementSetup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event((event) => (${value})((event as CustomEvent).detail)));`);
      return '';
    }

    const eventName = name.slice(2).toLowerCase();
    ctx.elementSetup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event(${value}));`);
    return '';
  }

  const setter = PROPERTY_PROPS.has(name) ? '__setProperty' : '__setAttribute';
  ctx.deps.push(value);
  ctx.patches.push({ code: `${setter}(${elementVar}, ${stringLiteral(name)}, ${value});`, deps: [value] });
  return '';
}
