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

export type DerivedContext = {
  /** Variables declared in the component setup scope. */
  locals: Set<string>;
  /** Names of setup variables that are compiled to computed getters. */
  derived: Set<string>;
  /** When compiling a keyed map row, maps the item parameter to the source array name. */
  mapItemSource?: { itemName: string; sourceName: string };
  /** Rewrite references to computed getters into getter calls. */
  expand(expression: string): string;
  /** Return local source variables an expression depends on. Computed getters contribute nothing static. */
  sourceDeps(expression: string): string[];
  /** True if the expression contains no computed derived variables. */
  isPure(expression: string): boolean;
};

const GLOBAL_IDENTIFIERS = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'console', 'window', 'document', 'Math', 'JSON', 'Date', 'String', 'Number',
  'Array', 'Object', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  '__event', '__componentBlock', '__createBlock', '__setText',
  '__setElementText', '__setClass', '__setProperty', '__setAttribute',
  '__setStyle', '__setChild', '__spreadProps', '__keyedMap', '__cloneTemplate',
  '__computed',
]);

/** Extract top-level identifiers from a code string using the AST. */
export function extractIdentifiers(code: string): string[] {
  const sourceFile = ts.createSourceFile('temp.ts', `(${code})`, ts.ScriptTarget.Latest, true);
  const ids: string[] = [];
  const seen = new Set<string>();

  function walk(node: ts.Node) {
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
        if (!seen.has(name)) {
          seen.add(name);
          ids.push(name);
        }
      }
    }
    ts.forEachChild(node, walk);
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

    // Reject new expressions (conservative safety)
    if (ts.isNewExpression(node)) {
      pure = false;
      return;
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return pure;
}

/** Build a derived-value context from the setup statements of a component. */
export function buildDerivedContext(
  source: ts.SourceFile,
  setupStatements: ts.Statement[],
): DerivedContext {
  const allDecls = new Map<string, string>(); // varName -> init expression
  const reassigned = new Set<string>();

  for (const stmt of setupStatements) {
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

    // Track simple reassignments: `x = ...`, `x += ...`
    if (ts.isExpressionStatement(stmt)) {
      const expr = stmt.expression;
      if (ts.isBinaryExpression(expr) && ts.isIdentifier(expr.left)) {
        const op = expr.operatorToken.kind;
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
          reassigned.add(expr.left.text);
        }
      }
      if (ts.isPrefixUnaryExpression(expr)) {
        if (
          expr.operator === ts.SyntaxKind.PlusPlusToken ||
          expr.operator === ts.SyntaxKind.MinusMinusToken
        ) {
          const operand = expr.operand;
          if (ts.isIdentifier(operand)) {
            reassigned.add(operand.text);
          }
        }
      }
      if (ts.isPostfixUnaryExpression(expr)) {
        if (
          expr.operator === ts.SyntaxKind.PlusPlusToken ||
          expr.operator === ts.SyntaxKind.MinusMinusToken
        ) {
          if (ts.isIdentifier(expr.operand)) {
            reassigned.add(expr.operand.text);
          }
        }
      }
    }
  }

  // Determine which variables are derived:
  // - Has an initialization expression
  // - Expression looks pure
  // - References at least one other local variable
  // - Never reassigned
  const derived = new Set<string>();
  const localNames = new Set(allDecls.keys());

  for (const [name, init] of allDecls) {
    if (reassigned.has(name)) continue;
    if (!looksPure(init)) continue;
    const refs = extractIdentifiers(init);
    const localRefs = refs.filter((r) => localNames.has(r) && r !== name);
    if (localRefs.length === 0) continue;
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

  function isPure(expression: string): boolean {
    return !extractIdentifiers(expression).some((id) => derived.has(id));
  }

  return { locals: localNames, derived, expand, sourceDeps, isPure };
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
