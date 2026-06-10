/**
 * @fileoverview Derived-value analysis for the Auwla compiler.
 *
 * When a component declares `let doubled = count * 2`, the compiler
 * treats `doubled` as a derived value: its initialization expression is
 * inlined into every patch that reads it so the value stays fresh as
 * `count` changes.
 *
 * This module builds a dependency graph from the component's setup
 * statements, determines which variables are pure derived values, and
 * expands derived references in patch / event code.
 */

import ts from 'typescript';

export type DerivedContext = {
  /** Variables declared in the component setup scope. */
  locals: Set<string>;
  /** Variables that are pure derived values (init expression + never reassigned). */
  derived: Map<string, string>;
  /** Expand derived references in an expression string. */
  expand(expression: string): string;
  /** Return local source variables an expression depends on, expanding derived aliases. */
  sourceDeps(expression: string): string[];
  /** True if the expression contains no derived variables (nothing to expand). */
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
]);

/** Extract top-level identifiers from a code string (naive but fast). */
export function extractIdentifiers(code: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  // Remove string literals
  const withoutStrings = code.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '');
  // Remove numeric literals, then match identifiers
  const cleaned = withoutStrings
    .replace(/\b\d+(?:\.\d+)?\b/g, '')
    .replace(/\b(?:true|false|null|undefined|NaN|Infinity)\b/g, '');

  const re = /\b([A-Za-z_$][\w$]*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const id = m[1]!;
    if (GLOBAL_IDENTIFIERS.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** True if the expression looks side-effect free (no calls, no `new`). */
function looksPure(expression: string): boolean {
  const withoutStrings = expression.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '');
  // Reject function calls, new, template literals with tag, assignments
  if (/\b\w+\s*\(/.test(withoutStrings)) return false;
  if (/\bnew\s+/.test(withoutStrings)) return false;
  if (/`[^`]*\${/.test(expression)) return false; // template literal with interpolation — may call toString
  if (/[=!<>]?=/.test(withoutStrings)) return false; // assignments or comparators with side effects? actually comparators are fine
  // More precise: reject `=` that's not `==` or `===` or `!=` or `!==`
  const hasAssignment = /(?<![=!])=(?![=])/.test(withoutStrings);
  if (hasAssignment) return false;
  return true;
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
  const derived = new Map<string, string>();
  const localNames = new Set(allDecls.keys());

  for (const [name, init] of allDecls) {
    if (reassigned.has(name)) continue;
    if (!looksPure(init)) continue;
    const refs = extractIdentifiers(init);
    const localRefs = refs.filter((r) => localNames.has(r) && r !== name);
    if (localRefs.length === 0) continue;
    derived.set(name, init);
  }

  // Transitive expansion: keep resolving until stable
  function expandOnce(expr: string): string {
    let result = expr;
    for (const [name, init] of derived) {
      // Replace whole-word references only
      const re = new RegExp(`\\b${name}\\b`, 'g');
      if (re.test(result)) {
        result = result.replace(re, `(${init})`);
      }
    }
    return result;
  }

  function expand(expression: string): string {
    let prev = expression;
    // Limit iterations to avoid infinite loops from circular deps
    for (let i = 0; i < 10; i++) {
      const next = expandOnce(prev);
      if (next === prev) break;
      prev = next;
    }
    return prev;
  }

  function sourceDeps(expression: string): string[] {
    const deps = new Set<string>();
    const visit = (expr: string, seen = new Set<string>()) => {
      for (const id of extractIdentifiers(expr)) {
        if (!localNames.has(id)) continue;
        if (derived.has(id)) {
          if (seen.has(id)) continue;
          seen.add(id);
          visit(derived.get(id)!, seen);
        } else {
          deps.add(id);
        }
      }
    };
    visit(expression);
    return Array.from(deps);
  }

  function isPure(expression: string): boolean {
    const ids = extractIdentifiers(expression);
    return !ids.some((id) => derived.has(id));
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
