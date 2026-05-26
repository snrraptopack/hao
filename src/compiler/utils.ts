/**
 * @fileoverview Pure AST helpers and string utilities for the Auwla compiler.
 *
 * These functions have no side effects and depend only on the TypeScript AST.
 */

import ts from 'typescript';

/** Extract the raw text of an expression from the source file. */
export function expressionText(source: ts.SourceFile, expression: ts.Expression): string {
  return expression.getText(source);
}

/** JSON-stringify a string for use in generated code. */
export function stringLiteral(value: string): string {
  return JSON.stringify(value);
}

/** Escape a string for safe inclusion in static HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build a `childNodes` path expression from a root variable and index array. */
export function pathExpression(root: string, path: number[]): string {
  return path.reduce((expression, index) => `${expression}.childNodes[${index}]!`, root);
}

/** Render a static HTML attribute string. */
export function staticAttributeHtml(name: string, value: string | true): string {
  return value === true ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`;
}

/** Decode JSX entity escapes into literal characters. */
export function decodeJsxText(value: string): string {
  return value.replace(/&(#x[\da-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g, (entity, body: string) => {
    switch (body) {
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      case 'nbsp': return '\u00a0';
      default: {
        const code = body.startsWith('#x')
          ? Number.parseInt(body.slice(2), 16)
          : body.startsWith('#')
            ? Number.parseInt(body.slice(1), 10)
            : NaN;
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
    }
  });
}

/**
 * Infer row dependencies from expressions that reference `itemName`.
 *
 * When every free identifier in an expression is a property access on
 * `itemName`, we can narrow the dependency list to just those properties.
 * Otherwise we fall back to the whole expression.
 */
export function rowDependencies(expressions: string[], itemName: string): string[] {
  const deps: string[] = [];
  const seen = new Set<string>();
  const propertyPattern = new RegExp(`\\b${itemName}\\.[A-Za-z_$][\\w$]*`, 'g');
  const identifierPattern = /\b[A-Za-z_$][\w$]*\b/;

  for (const expression of expressions) {
    const matches = expression.match(propertyPattern);
    const withoutStrings = expression.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '');
    const remaining = withoutStrings
      .replace(propertyPattern, '')
      .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '')
      .replace(/[0-9]+(?:\.[0-9]+)?/g, '')
      .replace(/[^A-Za-z_$]+/g, '');
    const nextDeps = matches && matches.length > 0 && !identifierPattern.test(remaining)
      ? matches
      : [expression];

    for (const dep of nextDeps) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      deps.push(dep);
    }
  }

  return deps;
}

/** Infer dependencies for a single expression. */
export function expressionDependencies(expression: string, itemName: string): string[] {
  return rowDependencies([expression], itemName);
}

/** Return true if the expression is a compile-time constant. */
export function isStaticExpression(expression: ts.Expression): boolean {
  return ts.isStringLiteralLike(expression)
    || ts.isNumericLiteral(expression)
    || expression.kind === ts.SyntaxKind.TrueKeyword
    || expression.kind === ts.SyntaxKind.FalseKeyword
    || expression.kind === ts.SyntaxKind.NullKeyword;
}

/** Return true if the JSX text node contains only whitespace. */
export function isWhitespaceJsxText(node: ts.JsxText): boolean {
  return node.getFullText().trim() === '';
}

/** Get the intrinsic tag name, or null if it's not a plain lowercase identifier. */
export function intrinsicName(name: ts.JsxTagNameExpression): string | null {
  if (!ts.isIdentifier(name)) return null;
  return /^[a-z]/.test(name.text) ? name.text : null;
}

/** Extract the expression from a JSX expression container. */
export function childExpression(child: ts.JsxExpression): ts.Expression | null {
  return child.expression ?? null;
}

/** Unwrap parentheses to reach a JSX element. */
export function unwrapJsxExpression(expression: ts.Expression): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) return expression;
  if (ts.isParenthesizedExpression(expression)) return unwrapJsxExpression(expression.expression);
  return null;
}

/** Return true if the AST subtree contains any JSX. */
export function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
  return node.getChildren().some(containsJsx);
}

/**
 * Return true if a child expression cannot be rendered as a simple text node.
 *
 * Conditional expressions, binary expressions with JSX, and arrays all need
 * the full `__setChild` runtime path.
 */
export function needsChildPatch(expression: ts.Expression): boolean {
  if (containsJsx(expression) || ts.isArrayLiteralExpression(expression)) return true;
  if (ts.isConditionalExpression(expression)) return true;
  if (ts.isBinaryExpression(expression)) {
    return expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      || expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
      || containsJsx(expression);
  }
  return false;
}

/** Return true if the expression is a `.map()` call. */
export function isMapCall(expression: ts.Expression): boolean {
  return ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.name.text === 'map';
}

/** Extract the `key` attribute expression from a JSX element, if present. */
export function keyAttribute(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): ts.Expression | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) continue;
    if (!ts.isIdentifier(attribute.name) || attribute.name.text !== 'key') continue;
    if (!attribute.initializer || !ts.isJsxExpression(attribute.initializer)) return null;
    return childExpression(attribute.initializer);
  }
  return null;
}

/** Unwrap a concise body to find the root JSX element of a render closure. */
export function unwrapJsxBody(body: ts.ConciseBody): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxElement(body) || ts.isJsxSelfClosingElement(body)) return body;
  if (ts.isParenthesizedExpression(body)) {
    const expression = body.expression;
    if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) return expression;
  }
  return null;
}

/** Extract a JSX return statement from a block body. */
export function unwrapJsxReturn(body: ts.Block): ts.JsxElement | ts.JsxSelfClosingElement | null {
  for (const statement of body.statements) {
    if (!ts.isReturnStatement(statement)) continue;
    const expression = statement.expression;
    if (!expression) continue;
    return unwrapJsxExpression(expression);
  }
  return null;
}

/** Find a function/arrow/component definition by name in a source file. */
export function findComponentDefinition(
  source: ts.SourceFile,
  name: string,
): ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null {
  let result: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null = null;

  function visit(node: ts.Node) {
    if (result) return;

    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      result = node;
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === name && decl.initializer) {
          if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
            result = decl.initializer;
            return;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return result;
}

/** Check whether a function is a simple inlinable component (returns JSX, no setup state). */
export function isInlinableComponent(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): boolean {
  if (node.parameters.length > 1) return false;
  const body = node.body;
  if (!body) return false;
  const jsx = ts.isBlock(body) ? unwrapJsxReturn(body) : unwrapJsxExpression(body);
  if (!jsx) return false;
  return true;
}

/** Extract the returned JSX from an inlinable component. */
export function extractComponentJsx(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): ts.JsxElement | ts.JsxSelfClosingElement | null {
  const body = node.body;
  if (!body) return null;
  return ts.isBlock(body) ? unwrapJsxReturn(body) : unwrapJsxExpression(body);
}

/** Check if a node subtree references `props.children` or a bare `children` identifier. */
export function referencesChildren(node: ts.Node): boolean {
  if (ts.isIdentifier(node) && node.text === 'children') return true;
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'props' &&
    ts.isIdentifier(node.name) &&
    node.name.text === 'children'
  ) {
    return true;
  }
  return ts.forEachChild(node, referencesChildren) ?? false;
}
