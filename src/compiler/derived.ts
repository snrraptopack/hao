/**
 * @fileoverview Derived-value analysis for the Auwla compiler.
 *
 * Setup variables that derive from other local state (e.g.
 * `const pending = todos.filter(...)`) are compiled into lazy computed getters
 * via `__computed(() => expr)`. Every read of the derived variable is rewritten
 * to a getter call, and the getter runs fresh on each render pass — so as long
 * as the component re-renders when its dependencies change, derived values are
 * always up to date.
 */

import ts from 'typescript';

export type ConditionalAssignment = {
  start: number;
  end: number;
  ifStart: number;
  ifEnd: number;
  init: string;
};

export type LoopReplacement = {
  start: number;
  end: number;
  body: string;
};

export type DerivedContext = {
  /** Variables declared in the component setup scope. */
  locals: Set<string>;
  /** Names of setup variables that are compiled to computed getters. */
  derived: Set<string>;
  /** When compiling a keyed map row, maps the item parameter to the source array name. */
  mapItemSource?: { itemName: string; sourceName: string };
  /** Uninitialized variables that are assigned inside an if/else, mapped to their synthetic initializer. */
  conditionalAssignments: Map<string, ConditionalAssignment>;
  /** Variables declared as empty arrays and populated by a single following loop, mapped to their computed body. */
  loopReplacements: Map<string, LoopReplacement>;
  /** Rewrite references to computed getters into getter calls. */
  expand(expression: string): string;
  /** Return local source variables an expression depends on. Computed getters contribute nothing static. */
  sourceDeps(expression: string): string[];
  /** Return all transitive local source dependencies an expression depends on. */
  allSourceDeps(expression: string): string[];
  /** True if the expression contains no computed derived variables. */
  isPure(expression: string): boolean;
  /** True if the component setup contains any reactive side-effects. */
  hasEffects?: boolean;
};

const GLOBAL_IDENTIFIERS = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'console', 'window', 'document', 'Math', 'JSON', 'Date', 'String', 'Number',
  'Array', 'Object', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  '__event', '__componentBlock', '__createBlock', '__createBlockSimple', '__setText',
  '__setElementText', '__setClass', '__setProperty', '__setAttribute',
  '__setStyle', '__setChild', '__spreadProps', '__keyedMap', '__cloneTemplate',
  '__computed',
]);

function collectScopeDeclarations(node: ts.Node, scope: Set<string>) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    scope.add(node.name.text);
  }
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    return;
  }
  ts.forEachChild(node, (child) => collectScopeDeclarations(child, scope));
}

/** Extract top-level identifiers from a code string using the AST. */
export function extractIdentifiers(code: string): string[] {
  const sourceFile = ts.createSourceFile('temp.ts', `(${code})`, ts.ScriptTarget.Latest, true);
  const ids: string[] = [];
  const seen = new Set<string>();
  const scopes: Set<string>[] = [new Set()];

  function walk(node: ts.Node) {
    const isFunction = ts.isFunctionDeclaration(node) ||
                       ts.isFunctionExpression(node) ||
                       ts.isArrowFunction(node);

    if (isFunction) {
      const scope = new Set<string>();
      const fn = node as ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
      for (const param of fn.parameters) {
        if (ts.isIdentifier(param.name)) {
          scope.add(param.name.text);
        }
      }
      if (fn.body) {
        collectScopeDeclarations(fn.body, scope);
      }
      scopes.push(scope);
    }

    if (ts.isIdentifier(node)) {
      const name = node.text;
      
      let isPropName = false;
      if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
        isPropName = true;
      }
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
        isPropName = true;
      }
      if (ts.isBindingElement(node.parent) && node.parent.propertyName === node) {
        isPropName = true;
      }
      if (ts.isJsxAttribute(node.parent) && node.parent.name === node) {
        isPropName = true;
      }

      if (!isPropName && !GLOBAL_IDENTIFIERS.has(name)) {
        let isShadowed = false;
        for (let i = scopes.length - 1; i >= 0; i--) {
          if (scopes[i]!.has(name)) {
            isShadowed = true;
            break;
          }
        }
        if (!isShadowed && !seen.has(name)) {
          seen.add(name);
          ids.push(name);
        }
      }
    }

    ts.forEachChild(node, walk);

    if (isFunction) {
      scopes.pop();
    }
  }

  walk(sourceFile);
  return ids;
}

/** True if the expression is safe to wrap in a computed getter. */
function looksPure(expression: string): boolean {
  const sourceFile = ts.createSourceFile('temp.ts', `(${expression})`, ts.ScriptTarget.Latest, true);
  let pure = true;

  function walk(node: ts.Node) {
    if (!pure) return;
    
    // Reject assignments (e.g. =, +=, etc.)
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsToken ||
        op === ts.SyntaxKind.PlusEqualsToken ||
        op === ts.SyntaxKind.MinusEqualsToken ||
        op === ts.SyntaxKind.AsteriskEqualsToken ||
        op === ts.SyntaxKind.SlashEqualsToken ||
        op === ts.SyntaxKind.PercentEqualsToken ||
        op === ts.SyntaxKind.AmpersandEqualsToken ||
        op === ts.SyntaxKind.BarEqualsToken ||
        op === ts.SyntaxKind.CaretEqualsToken ||
        op === ts.SyntaxKind.LessThanLessThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
        op === ts.SyntaxKind.AsteriskAsteriskEqualsToken ||
        op === ts.SyntaxKind.BarBarEqualsToken ||
        op === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
        op === ts.SyntaxKind.QuestionQuestionEqualsToken
      ) {
        pure = false;
        return;
      }
    }

    // Reject prefix/postfix increment/decrement (e.g. ++x, x--)
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      if (
        node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken
      ) {
        pure = false;
        return;
      }
    }

    // Constructing the built-in collection types is a read-only operation for
    // derived-state purposes. Their iterable arguments may read reactive local
    // state (for example, `new Set(categories.values())`), but do not mutate it.
    // Keep other constructors conservative because they can have side effects.
    if (ts.isNewExpression(node)) {
      if (!ts.isIdentifier(node.expression) ||
          (node.expression.text !== 'Set' && node.expression.text !== 'Map')) {
        pure = false;
        return;
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return pure;
}

/** Extract a simple assignment `name = expr` from a statement or single-statement block. */
function extractSimpleAssignment(source: ts.SourceFile, stmt: ts.Statement, name: string): string | null {
  let inner: ts.Statement = stmt;
  if (ts.isBlock(stmt) && stmt.statements.length === 1) {
    inner = stmt.statements[0]!;
  }
  if (!ts.isExpressionStatement(inner)) return null;
  const expr = inner.expression;
  if (!ts.isBinaryExpression(expr)) return null;
  if (expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return null;
  if (!ts.isIdentifier(expr.left) || expr.left.text !== name) return null;
  return expr.right.getText(source);
}

/** Build a derived-value context from the setup statements of a component. */
export function buildDerivedContext(
  source: ts.SourceFile,
  setupStatements: ts.Statement[],
): DerivedContext {
  const allDecls = new Map<string, string>(); // varName -> init expression
  const reassigned = new Set<string>();
  const mutated = new Set<string>();

  /** Detect mutating method calls like `set.add()`, `map.set()`, `arr.push()`. */
  function collectMutatedReceivers(node: ts.Node): void {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression;
    if (!ts.isPropertyAccessExpression(callee)) return;

    const methodName = callee.name.text;
    const MUTATING_METHODS = new Set([
      // Array
      'push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort', 'fill', 'copyWithin',
      // Map
      'set', 'delete', 'clear',
      // Set
      'add', 'delete', 'clear',
    ]);
    if (!MUTATING_METHODS.has(methodName)) return;

    let root: ts.Expression = callee.expression;
    while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) {
      root = root.expression;
    }
    if (ts.isIdentifier(root)) {
      mutated.add(root.text);
    }
  }

  function visitForMutations(node: ts.Node): void {
    collectMutatedReceivers(node);
    ts.forEachChild(node, visitForMutations);
  }

  /** Collect every simple identifier that is the target of an assignment. */
  function collectAssignedIdentifiers(node: ts.Node, out: Set<string>): void {
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const isAssignment =
        op === ts.SyntaxKind.EqualsToken ||
        op === ts.SyntaxKind.PlusEqualsToken ||
        op === ts.SyntaxKind.MinusEqualsToken ||
        op === ts.SyntaxKind.AsteriskEqualsToken ||
        op === ts.SyntaxKind.SlashEqualsToken ||
        op === ts.SyntaxKind.PercentEqualsToken ||
        op === ts.SyntaxKind.AmpersandEqualsToken ||
        op === ts.SyntaxKind.BarEqualsToken ||
        op === ts.SyntaxKind.CaretEqualsToken ||
        op === ts.SyntaxKind.LessThanLessThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
        op === ts.SyntaxKind.AsteriskAsteriskEqualsToken ||
        op === ts.SyntaxKind.BarBarEqualsToken ||
        op === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
        op === ts.SyntaxKind.QuestionQuestionEqualsToken;
      if (isAssignment) {
        collectPatternIdentifiers(node.left, out);
        // Only recurse into the right side; the left side was handled as a pattern.
        collectAssignedIdentifiers(node.right, out);
        return;
      }
    }

    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      if (
        node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken
      ) {
        if (ts.isIdentifier(node.operand)) {
          out.add(node.operand.text);
        }
      }
    }

    ts.forEachChild(node, (child) => collectAssignedIdentifiers(child, out));
  }

  /** Collect identifiers from a destructuring or simple assignment target. */
  function collectPatternIdentifiers(node: ts.Node, out: Set<string>): void {
    if (ts.isIdentifier(node)) {
      out.add(node.text);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        collectPatternIdentifiers(element, out);
      }
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) {
          collectPatternIdentifiers(property.initializer, out);
        } else if (ts.isShorthandPropertyAssignment(property)) {
          out.add(property.name.text);
        }
      }
      return;
    }
    if (ts.isBindingElement(node)) {
      if (node.name) collectPatternIdentifiers(node.name, out);
      if (node.initializer) collectAssignedIdentifiers(node.initializer, out);
      return;
    }
  }

  // Identify if/else statements that are the initializer for an immediately
  // preceding uninitialized variable. These are not reassignments; they are
  // conditional initializers and should be skipped by reassignment detection.
  const conditionalAssignmentIfs = new Set<ts.IfStatement>();
  for (let i = 0; i < setupStatements.length - 1; i++) {
    const declStmt = setupStatements[i];
    const nextStmt = setupStatements[i + 1];
    if (!declStmt || !nextStmt || !ts.isVariableStatement(declStmt) || !ts.isIfStatement(nextStmt)) continue;
    for (const decl of declStmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.initializer) continue;
      const name = decl.name.text;
      if (!extractSimpleAssignment(source, nextStmt.thenStatement, name)) continue;
      if (nextStmt.elseStatement && !extractSimpleAssignment(source, nextStmt.elseStatement, name)) continue;
      conditionalAssignmentIfs.add(nextStmt);
    }
  }

  for (const stmt of setupStatements) {
    visitForMutations(stmt);
    if (!conditionalAssignmentIfs.has(stmt as ts.IfStatement)) {
      collectAssignedIdentifiers(stmt, reassigned);
    }

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const name = decl.name.text;
        if (decl.initializer) {
          allDecls.set(name, decl.initializer.getText(source));
        } else {
          allDecls.set(name, 'undefined');
        }
      }
    }
  }

  // Detect uninitialized variables that are assigned inside an immediately
  // following if/else. These become derived values with a ternary initializer.
  const conditionalAssignments = new Map<string, ConditionalAssignment>();

  for (let i = 0; i < setupStatements.length; i++) {
    const stmt = setupStatements[i];
    if (!stmt || !ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (decl.initializer) continue;

      const nextStmt = setupStatements[i + 1];
      if (!nextStmt || !ts.isIfStatement(nextStmt)) continue;

      const thenExpr = extractSimpleAssignment(source, nextStmt.thenStatement, name);
      if (!thenExpr) continue;

      const elseExpr = nextStmt.elseStatement
        ? extractSimpleAssignment(source, nextStmt.elseStatement, name)
        : null;

      const condition = nextStmt.expression.getText(source);
      const init = elseExpr
        ? `${condition} ? ${thenExpr} : ${elseExpr}`
        : `${condition} ? ${thenExpr} : undefined`;

      allDecls.set(name, init);
      conditionalAssignments.set(name, {
        start: stmt.getStart(source),
        end: nextStmt.getEnd(),
        ifStart: nextStmt.getStart(source),
        ifEnd: nextStmt.getEnd(),
        init,
      });
    }
  }

  // Detect simple `let items = []; for (const x of list) items.push(...);` loops
  // that derive an array from local state. They become computed getters whose body
  // rebuilds the array on every invalidation.
  const loopReplacements = new Map<string, LoopReplacement>();

  for (let i = 0; i < setupStatements.length - 1; i++) {
    const declStmt = setupStatements[i];
    if (!declStmt || !ts.isVariableStatement(declStmt)) continue;
    if (declStmt.declarationList.declarations.length !== 1) continue;
    const decl = declStmt.declarationList.declarations[0]!;
    if (!ts.isIdentifier(decl.name)) continue;
    const name = decl.name.text;
    if (!decl.initializer || !ts.isArrayLiteralExpression(decl.initializer)) continue;
    if (decl.initializer.elements.length !== 0) continue;

    const loopStmt = setupStatements[i + 1];
    if (!loopStmt || !ts.isForOfStatement(loopStmt)) continue;

    // Only support a single loop variable: `for (const x of ...)` or `for (let x of ...)`
    const loopVarDecl = ts.isVariableDeclarationList(loopStmt.initializer)
      ? loopStmt.initializer.declarations[0]
      : null;
    if (!loopVarDecl || !ts.isIdentifier(loopVarDecl.name)) continue;

    const loopBody = loopStmt.statement;
    if (!ts.isBlock(loopBody)) continue;

    // Only allow `name.push(expr)` statements inside the loop.
    let bodyPure = true;
    for (const bodyStmt of loopBody.statements) {
      if (!ts.isExpressionStatement(bodyStmt)) {
        bodyPure = false;
        break;
      }
      const expr = bodyStmt.expression;
      if (!ts.isCallExpression(expr)) {
        bodyPure = false;
        break;
      }
      const callee = expr.expression;
      if (!ts.isPropertyAccessExpression(callee)) {
        bodyPure = false;
        break;
      }
      if (!ts.isIdentifier(callee.expression) || callee.expression.text !== name) {
        bodyPure = false;
        break;
      }
      if (callee.name.text !== 'push') {
        bodyPure = false;
        break;
      }
      // The pushed expression must be pure (no assignments / side effects).
      for (const arg of expr.arguments) {
        if (!looksPure(arg.getText(source))) {
          bodyPure = false;
          break;
        }
      }
      if (!bodyPure) break;
    }
    if (!bodyPure) continue;

    // The variable must not be reassigned later in setup.
    if (reassigned.has(name)) continue;

    const sourceList = loopStmt.expression.getText(source);
    const bodyText = loopBody.getText(source);
    const loopHeader = `for (${loopStmt.initializer.getText(source)} of ${sourceList})`;
    const computedBody = `const ${name} = [];\n${loopHeader} ${bodyText}\nreturn ${name};`;

    allDecls.set(name, computedBody);
    loopReplacements.set(name, {
      start: declStmt.getStart(source),
      end: loopStmt.getEnd(),
      body: computedBody,
    });
  }

  // Determine which variables are derived:
  // - Has an initialization expression
  // - Expression looks pure
  // - References at least one other local variable
  // - Never reassigned or mutated (e.g. `set.add()`, `map.set()`, `arr.push()`)
  const derived = new Set<string>();
  const localNames = new Set(allDecls.keys());

  for (const [name, init] of allDecls) {
    if (reassigned.has(name) || mutated.has(name)) continue;
    if (!looksPure(init)) continue;
    const refs = extractIdentifiers(init);
    const localRefs = refs.filter((r) => localNames.has(r) && r !== name);
    if (localRefs.length === 0) continue;
    derived.add(name);
  }

  // Loop-derived arrays bypass the normal pure-expression check because their
  // body is a multi-statement computed getter; still mark them as derived.
  for (const name of loopReplacements.keys()) {
    derived.add(name);
  }

  // Rewrite references to derived getters: pendingTodos -> pendingTodos()
  function expand(expression: string): string {
    const sourceFile = ts.createSourceFile('temp.ts', expression, ts.ScriptTarget.Latest, true);
    const replacements: Array<{ start: number; end: number; text: string }> = [];
    const shadowedStack = [new Set<string>()];

    function walk(node: ts.Node) {
      const isNewScope = ts.isFunctionDeclaration(node) ||
                         ts.isFunctionExpression(node) ||
                         ts.isArrowFunction(node) ||
                         ts.isBlock(node);

      if (isNewScope) {
        const parentScope = shadowedStack[shadowedStack.length - 1]!;
        const newScope = new Set(parentScope);
        
        if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
          for (const param of node.parameters) {
            if (ts.isIdentifier(param.name)) {
              newScope.add(param.name.text);
            }
          }
        }
        
        node.forEachChild(child => {
          if (ts.isVariableStatement(child)) {
            for (const decl of child.declarationList.declarations) {
              if (ts.isIdentifier(decl.name)) {
                newScope.add(decl.name.text);
              }
            }
          }
        });

        shadowedStack.push(newScope);
      }

      if (ts.isIdentifier(node)) {
        const name = node.text;
        const currentShadowed = shadowedStack[shadowedStack.length - 1]!;

        if (derived.has(name) && !currentShadowed.has(name)) {
          let isPropName = false;
          if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
            isPropName = true;
          }
          if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
            isPropName = true;
          }
          if (ts.isBindingElement(node.parent) && node.parent.propertyName === node) {
            isPropName = true;
          }
          if (ts.isJsxAttribute(node.parent) && node.parent.name === node) {
            isPropName = true;
          }

          if (!isPropName) {
            replacements.push({
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              text: `${name}()`
            });
          }
        }
      }

      ts.forEachChild(node, walk);

      if (isNewScope) {
        shadowedStack.pop();
      }
    }

    walk(sourceFile);

    replacements.sort((a, b) => b.start - a.start);
    let result = expression;
    for (const r of replacements) {
      result = result.slice(0, r.start) + r.text + result.slice(r.end);
    }
    return result;
  }

  function sourceDeps(expression: string): string[] {
    const deps = new Set<string>();
    for (const id of extractIdentifiers(expression)) {
      if (!localNames.has(id)) continue;
      // Computed getters are evaluated at render time; they don't contribute
      // static source dependencies that the dirty tracker can watch.
      if (derived.has(id)) continue;
      deps.add(id);
    }
    return Array.from(deps);
  }

  function allSourceDeps(expression: string): string[] {
    const deps = new Set<string>();
    const visited = new Set<string>();
    function walk(expr: string) {
      for (const id of extractIdentifiers(expr)) {
        if (!localNames.has(id)) continue;
        if (derived.has(id)) {
          if (!visited.has(id)) {
            visited.add(id);
            const body = allDecls.get(id);
            if (body) walk(body);
          }
        } else {
          deps.add(id);
        }
      }
    }
    walk(expression);
    return Array.from(deps);
  }

  function isPure(expression: string): boolean {
    return !extractIdentifiers(expression).some((id) => derived.has(id));
  }

  return { locals: localNames, derived, conditionalAssignments, loopReplacements, expand, sourceDeps, allSourceDeps, isPure, hasEffects: false };
}

/** True if a handler is too complex or mutates through a property path. */
export function needsFullDirty(expression: ts.Expression): boolean {
  let full = false;

  function walk(node: ts.Node): void {
    if (full) return;
    if (ts.isReturnStatement(node) || ts.isTryStatement(node)) {
      full = true;
      return;
    }

    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const assignOps = new Set([
        ts.SyntaxKind.EqualsToken,
        ts.SyntaxKind.PlusEqualsToken,
        ts.SyntaxKind.MinusEqualsToken,
        ts.SyntaxKind.AsteriskEqualsToken,
        ts.SyntaxKind.SlashEqualsToken,
        ts.SyntaxKind.PercentEqualsToken,
        ts.SyntaxKind.AmpersandEqualsToken,
        ts.SyntaxKind.BarEqualsToken,
        ts.SyntaxKind.CaretEqualsToken,
        ts.SyntaxKind.LessThanLessThanEqualsToken,
        ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
        ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
        ts.SyntaxKind.AsteriskAsteriskEqualsToken,
        ts.SyntaxKind.BarBarEqualsToken,
        ts.SyntaxKind.AmpersandAmpersandEqualsToken,
        ts.SyntaxKind.QuestionQuestionEqualsToken,
      ]);
      if (assignOps.has(op) && !ts.isIdentifier(node.left)) {
        full = true;
        return;
      }
    }

    if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
      if (
        (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
        !ts.isIdentifier(node.operand)
      ) {
        full = true;
        return;
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(expression);
  return full;
}

/**
 * Walk an event-handler expression and collect every top-level identifier
 * that is directly mutated — via assignment (`x = …`, `x += …`) or a
 * postfix/prefix increment/decrement (`x++`, `--x`).
 *
 * Only direct identifier operands are reported; property-access mutations
 * like `obj.prop++` report the object root (`obj`) so callers can check
 * whether that root is a local component variable or an external reference.
 *
 * Returns `null` when the expression cannot be statically analysed.
 */
export function findMutatedVariables(expression: ts.Expression): string[] | null {
  const mutated = new Set<string>();

  function walk(node: ts.Node): void {
    // x = …, x += …, etc.
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const assignOps = new Set([
        ts.SyntaxKind.EqualsToken,
        ts.SyntaxKind.PlusEqualsToken,
        ts.SyntaxKind.MinusEqualsToken,
        ts.SyntaxKind.AsteriskEqualsToken,
        ts.SyntaxKind.SlashEqualsToken,
        ts.SyntaxKind.PercentEqualsToken,
        ts.SyntaxKind.AmpersandEqualsToken,
        ts.SyntaxKind.BarEqualsToken,
        ts.SyntaxKind.CaretEqualsToken,
        ts.SyntaxKind.LessThanLessThanEqualsToken,
        ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
        ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
        ts.SyntaxKind.AsteriskAsteriskEqualsToken,
        ts.SyntaxKind.BarBarEqualsToken,
        ts.SyntaxKind.AmpersandAmpersandEqualsToken,
        ts.SyntaxKind.QuestionQuestionEqualsToken,
      ]);
      if (assignOps.has(op)) {
        if (ts.isIdentifier(node.left)) {
          mutated.add(node.left.text);
        } else if (ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.expression)) {
          // `obj.prop = …` — report the object root
          mutated.add(node.left.expression.text);
        }
      }
    }

    // x++, x--
    if (ts.isPostfixUnaryExpression(node)) {
      if (
        node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken
      ) {
        if (ts.isIdentifier(node.operand)) {
          mutated.add(node.operand.text);
        } else if (ts.isPropertyAccessExpression(node.operand) && ts.isIdentifier(node.operand.expression)) {
          mutated.add(node.operand.expression.text);
        }
      }
    }

    // ++x, --x
    if (ts.isPrefixUnaryExpression(node)) {
      if (
        node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken
      ) {
        if (ts.isIdentifier(node.operand)) {
          mutated.add(node.operand.text);
        } else if (ts.isPropertyAccessExpression(node.operand) && ts.isIdentifier(node.operand.expression)) {
          mutated.add(node.operand.expression.text);
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(expression);
  return mutated.size > 0 ? Array.from(mutated) : [];
}
