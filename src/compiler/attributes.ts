/**
 * @fileoverview Attribute compilation for the Auwla compiler.
 */

import ts from 'typescript';
import { DynamicPatch, CompileContext, TemplateContext, PROPERTY_PROPS } from './types';
import { findMutatedVariables, needsFullDirty } from './derived';
import type { DerivedContext } from './derived';
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

function propertySourceName(node: ts.Expression, derivedCtx: DerivedContext | null): string | null {
  if (!ts.isPropertyAccessExpression(node)) return null;

  let root: ts.Expression = node.expression;
  let firstProp = node.name.text;
  while (ts.isPropertyAccessExpression(root)) {
    firstProp = root.name.text;
    root = root.expression;
  }

  if (!ts.isIdentifier(root)) return null;
  if (derivedCtx?.locals.has(root.text)) return null;
  return `${root.text}.${firstProp}`;
}

function dirtySourcesForHandler(expression: ts.Expression, derivedCtx: DerivedContext | null): string[] {
  const sources = new Set<string>();

  function walk(node: ts.Node): void {
    if (ts.isBinaryExpression(node)) {
      const source = propertySourceName(node.left, derivedCtx);
      if (source) sources.add(source);
    }

    if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
      const source = propertySourceName(node.operand, derivedCtx);
      if (source) sources.add(source);
    }

    ts.forEachChild(node, walk);
  }

  walk(expression);
  return Array.from(sources);
}

function dirtyMarksForHandler(expression: ts.Expression, derivedCtx: DerivedContext | null): string[] {
  if (!derivedCtx) return [];

  // If the handler value is a call expression (e.g. event.touch.sync(obj, 'x').handler(fn)),
  // it invokes modifier functions that may mutate their arguments directly
  // (rawPosition.x = ...) without those mutations appearing in the JSX source text.
  // The compiler cannot statically trace cross-function mutations, so default to
  // full-dirty to ensure all dependent style/attribute patches still run.
  // Direct function literals (arrow functions, function expressions) and plain
  // identifiers are still eligible for the optimised granular-dirty path.
  if (ts.isCallExpression(expression)) return ['__all'];

  if (needsFullDirty(expression)) return ['__all'];

  const mutated = findMutatedVariables(expression);
  if (mutated === null || mutated.some((name) => !derivedCtx.locals.has(name))) {
    return ['__all'];
  }

  return mutated;
}

function dirtyWrappedHandler(value: string, marks: string[], sources: string[]): string {
  if (marks.length === 0 && sources.length === 0) return value;
  const markCode = marks.map((name) => `__dirty.add(${stringLiteral(name)});`).join(' ');
  const sourceCode = sources.map((source) => `__dirtySource(${stringLiteral(source)});`).join(' ');
  return `((handler) => (event) => { ${markCode} ${sourceCode} return handler(event); })(${value})`;
}

function compileEventHandler(
  setup: string[],
  patches: DynamicPatch[],
  textId: number,
  elementVar: string,
  eventName: string,
  value: string,
  expression: ts.Expression,
  derivedCtx: DerivedContext | null,
): number {
  const expandedValue = derivedCtx ? derivedCtx.expand(value) : value;
  const marks = dirtyMarksForHandler(expression, derivedCtx);
  const sources = dirtySourcesForHandler(expression, derivedCtx);
  const handlerValue = dirtyWrappedHandler(expandedValue, marks, sources);
  const handlerVar = `eventHandler${textId}`;
  setup.push(`let ${handlerVar} = ${handlerValue};`);
  setup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event((event) => ${handlerVar}(event)));`);
  patches.push({ code: `${handlerVar} = ${handlerValue};`, deps: [expandedValue] });
  return textId + 1;
}

export function compileAttribute(
  ctx: CompileContext,
  elementVar: string,
  attribute: ts.JsxAttributeLike,
  isSvg = false,
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
      if (isSvg) {
        ctx.setup.push(`${elementVar}.setAttribute("class", ${stringLiteral(initializer.text)});`);
      } else {
        ctx.setup.push(`${elementVar}.className = ${stringLiteral(initializer.text)};`);
      }
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

  if (name.startsWith('emit:')) {
    if (!initializer || !ts.isJsxExpression(initializer)) return false;
    const expression = childExpression(initializer);
    if (!expression) return true;
    const value = expressionText(ctx.source, expression);
    const eventName = name.slice(5);
    const handlerVar = `eventHandler${ctx.textId++}`;
    ctx.setup.push(`let ${handlerVar} = ${value};`);
    ctx.setup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event((event) => ${handlerVar}((event as CustomEvent).detail)));`);
    ctx.patches.push({ code: `${handlerVar} = ${value};`, deps: [value] });
    return true;
  }

  if (name.startsWith('on') && name.length > 2) {
    const eventName = name.slice(2).toLowerCase();
    ctx.textId = compileEventHandler(ctx.setup, ctx.patches, ctx.textId, elementVar, eventName, value, expression, ctx.derivedCtx ?? null);
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

  if (name.startsWith('emit:')) {
    if (!initializer || !ts.isJsxExpression(initializer)) return null;
    const expression = childExpression(initializer);
    if (!expression) return '';
    const value = expressionText(ctx.source, expression);
    const eventName = name.slice(5);
    const handlerVar = `eventHandler${ctx.textId++}`;
    ctx.elementSetup.push(`let ${handlerVar} = ${value};`);
    ctx.elementSetup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event((event) => ${handlerVar}((event as CustomEvent).detail)));`);
    ctx.patches.push({ code: `${handlerVar} = ${value};`, deps: [value] });
    return '';
  }

  if (name.startsWith('on') && name.length > 2) {
    const eventName = name.slice(2).toLowerCase();
    ctx.textId = compileEventHandler(ctx.elementSetup, ctx.patches, ctx.textId, elementVar, eventName, value, expression, ctx.derivedCtx ?? null);
    return '';
  }

  const setter = PROPERTY_PROPS.has(name) ? '__setProperty' : '__setAttribute';
  ctx.deps.push(value);
  ctx.patches.push({ code: `${setter}(${elementVar}, ${stringLiteral(name)}, ${value});`, deps: [value] });
  return '';
}
