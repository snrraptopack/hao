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
 * Return true if an expression is a literal that renders safely as text.
 *
 * String literals, number literals, booleans, null, and undefined all
 * stringify predictably and never produce DOM nodes or arrays.
 */
function isTextLiteral(expression: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(expression)) {
    return isTextLiteral(expression.expression);
  }
  return ts.isStringLiteralLike(expression)
    || ts.isNumericLiteral(expression)
    || expression.kind === ts.SyntaxKind.TrueKeyword
    || expression.kind === ts.SyntaxKind.FalseKeyword
    || expression.kind === ts.SyntaxKind.NullKeyword
    || expression.kind === ts.SyntaxKind.UndefinedKeyword;
}

/**
 * Return true if a child expression cannot be rendered as a simple text node.
 *
 * Conditional expressions, binary expressions with JSX, and arrays all need
 * the full `__setChild` runtime path.
 */
export function needsChildPatch(expression: ts.Expression): boolean {
  if (containsJsx(expression) || ts.isArrayLiteralExpression(expression)) return true;
  if (ts.isCallExpression(expression)) return true;

  if (ts.isConditionalExpression(expression)) {
    // Only avoid __setChild when BOTH branches are text literals.
    return !isTextLiteral(expression.whenTrue) || !isTextLiteral(expression.whenFalse);
  }

  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      || expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      // For && and ||, only avoid __setChild when the right side is a text literal.
      return !isTextLiteral(expression.right);
    }
    return containsJsx(expression);
  }

  return false;
}

/** Unwrap a parenthesized expression to reach a `.map()` call. */
export function unwrapMapCall(expression: ts.Expression): ts.CallExpression | null {
  if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression) && expression.expression.name.text === 'map') {
    return expression;
  }
  if (ts.isParenthesizedExpression(expression)) {
    return unwrapMapCall(expression.expression);
  }
  return null;
}

/** Return true if the expression is a `.map()` call. */
export function isMapCall(expression: ts.Expression): boolean {
  return unwrapMapCall(expression) !== null;
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

/**
 * Extract a JSX return statement and any leading statements from a block body.
 * Used for map callbacks that may declare intermediate variables before returning JSX.
 */
export function unwrapJsxReturnWithStatements(
  source: ts.SourceFile,
  body: ts.Block,
): { row: ts.JsxElement | ts.JsxSelfClosingElement; leadingStatements: string[] } | null {
  const leadingStatements: string[] = [];
  let row: ts.JsxElement | ts.JsxSelfClosingElement | null = null;
  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement)) {
      const expression = statement.expression;
      if (expression) {
        row = unwrapJsxExpression(expression);
      }
      break;
    }
    leadingStatements.push(statement.getText(source));
  }
  return row ? { row, leadingStatements } : null;
}

/**
 * Extract JSX from a component that returns a render closure.
 *
 * Handles both `return () => <jsx>` and `return () => { return <jsx>; }`.
 */
export function unwrapJsxClosureReturn(body: ts.Block): ts.JsxElement | ts.JsxSelfClosingElement | null {
  for (const statement of body.statements) {
    if (!ts.isReturnStatement(statement)) continue;
    const expression = statement.expression;
    if (!expression) continue;
    if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      const arrowBody = expression.body;
      if (ts.isBlock(arrowBody)) {
        return unwrapJsxReturn(arrowBody);
      }
      return unwrapJsxExpression(arrowBody);
    }
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

function containsEventAttribute(node: ts.Node): boolean {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    for (const attr of node.attributes.properties) {
      if (ts.isJsxSpreadAttribute(attr)) continue;
      if (!ts.isIdentifier(attr.name) && !ts.isJsxNamespacedName(attr.name)) continue;
      const name = ts.isIdentifier(attr.name)
        ? attr.name.text
        : `${attr.name.namespace.text}:${attr.name.name.text}`;
      if ((name.startsWith('on') && name.length > 2) || name.startsWith('emit:')) {
        return true;
      }
    }
  }

  return node.getChildren().some(containsEventAttribute);
}

/** Check whether a function is a simple inlinable component (returns JSX, no setup state). */
export function isInlinableComponent(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): boolean {
  if (node.parameters.length > 1) return false;
  const body = node.body;
  if (!body) return false;

  let jsx: ts.JsxElement | ts.JsxSelfClosingElement | null = null;

  if (ts.isBlock(body)) {
    // Must be exactly one statement: a return statement. Any setup code
    // (variable declarations, function calls, etc.) makes inlining unsafe
    // because that code would be lost.
    if (body.statements.length !== 1) return false;
    const stmt = body.statements[0]!;
    if (!ts.isReturnStatement(stmt)) return false;
    const expr = stmt.expression;
    if (!expr) return false;

    jsx = unwrapJsxExpression(expr);

    // Also accept `return () => <jsx>` and `return () => { return <jsx>; }`
    if (!jsx && (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr))) {
      const closureBody = expr.body;
      if (ts.isBlock(closureBody)) {
        if (closureBody.statements.length !== 1) return false;
        const innerStmt = closureBody.statements[0]!;
        if (!ts.isReturnStatement(innerStmt)) return false;
        const innerExpr = innerStmt.expression;
        if (innerExpr) {
          jsx = unwrapJsxExpression(innerExpr);
        }
      } else {
        jsx = unwrapJsxExpression(closureBody);
      }
    }
  } else {
    jsx = unwrapJsxExpression(body);
  }

  return !!jsx && !containsEventAttribute(jsx);
}

/** Extract the returned JSX from an inlinable component. */
export function extractComponentJsx(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): ts.JsxElement | ts.JsxSelfClosingElement | null {
  const body = node.body;
  if (!body) return null;

  if (ts.isBlock(body)) {
    if (body.statements.length !== 1) return null;
    const stmt = body.statements[0]!;
    if (!ts.isReturnStatement(stmt)) return null;
    const expr = stmt.expression;
    if (!expr) return null;

    let jsx = unwrapJsxExpression(expr);
    if (!jsx && (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr))) {
      const closureBody = expr.body;
      if (ts.isBlock(closureBody)) {
        if (closureBody.statements.length !== 1) return null;
        const innerStmt = closureBody.statements[0]!;
        if (!ts.isReturnStatement(innerStmt)) return null;
        const innerExpr = innerStmt.expression;
        if (innerExpr) {
          jsx = unwrapJsxExpression(innerExpr);
        }
      } else {
        jsx = unwrapJsxExpression(closureBody);
      }
    }
    return jsx;
  }

  return unwrapJsxExpression(body);
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

/** Determine whether a component function should be left for runtime fallback. */
function componentHasSetupState(
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
): boolean {
  const body = node.body;
  if (!body) return false;
  if (!ts.isBlock(body)) return false;
  // A simple inlinable component has exactly one return statement and nothing else.
  return body.statements.length !== 1 || !ts.isReturnStatement(body.statements[0]!);
}

export type ComponentSkipInfo = {
  /** All uppercase-named component/function definitions found in the source. */
  definedComponents: Set<string>;
  /** Components with setup state that cannot be inlined at call sites. */
  nonInlinable: Set<string>;
  /** Components that reference children and must not be compiled at all. */
  skipCompile: Set<string>;
};

/** Analyze component definitions to decide which ones the compiler should avoid. */
export function analyzeComponentSkips(source: ts.SourceFile): ComponentSkipInfo {
  const definedComponents = new Set<string>();
  const nonInlinable = new Set<string>();
  const skipCompile = new Set<string>();

  function visit(node: ts.Node) {
    let def: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null = null;
    let name: string | null = null;

    if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
      def = node;
      name = node.name.text;
      definedComponents.add(name);
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          /^[A-Z]/.test(decl.name.text) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          def = decl.initializer;
          name = decl.name.text;
          definedComponents.add(name);
        }
      }
    }

    if (def && name) {
      const hasSetup = componentHasSetupState(def);
      const jsx = extractComponentJsx(def);
      const usesChildren = jsx && referencesChildren(jsx);

      if (hasSetup || usesChildren) {
        nonInlinable.add(name);
      }
      if (usesChildren) {
        skipCompile.add(name);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return { definedComponents, nonInlinable, skipCompile };
}
