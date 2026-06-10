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
  /** Variables that are pure derived values (init expression + never reassigned). */
  derived: Map<string, string>;
  /** Expand derived references in an expression string. */
  expand(expression: string): string;
  /** True if the expression contains no derived variables (nothing to expand). */
  isPure(expression: string): boolean;
  /** All local variable names declared in the setup scope. */
  localVars: Set<string>;
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
function extractIdentifiers(code: string): string[] {
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

  function isPure(expression: string): boolean {
    const ids = extractIdentifiers(expression);
    return !ids.some((id) => derived.has(id));
  }

  return { derived, expand, isPure, localVars: localNames };
}

/* ------------------------------------------------------------------ */
// Mutation tracking for fine-grained patching
/* ------------------------------------------------------------------ */

/**
 * Find variables mutated inside an expression AST.
 * Returns `null` if the control flow is too complex to analyze
 * (contains return, throw, try/catch, or nested functions).
 */
export function findMutatedVariables(expression: ts.Expression): string[] | null {
  const mutated = new Set<string>();
  let uncertain = false;

  function visit(node: ts.Node) {
    if (uncertain) return;

    // Complex control flow makes analysis uncertain
    if (ts.isReturnStatement(node)) {
      uncertain = true;
      return;
    }
    if (ts.isThrowStatement(node)) {
      uncertain = true;
      return;
    }
    if (ts.isTryStatement(node)) {
      uncertain = true;
      return;
    }
    if (ts.isSwitchStatement(node)) {
      // Switch can have fall-through; conservative
      uncertain = true;
      return;
    }

    // Don't recurse into nested functions
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node)
    ) {
      return;
    }

    // Direct assignment: `x = ...`
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
        if (ts.isIdentifier(node.left)) {
          mutated.add(node.left.text);
        } else if (ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.expression)) {
          // `obj.prop = ...` mutates obj
          mutated.add(node.left.expression.text);
        } else if (ts.isElementAccessExpression(node.left) && ts.isIdentifier(node.left.expression)) {
          // `obj[key] = ...` mutates obj
          mutated.add(node.left.expression.text);
        }
      }
    }

    // Prefix / postfix unary: `++x`, `x++`, `--x`, `x--`
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      if (
        node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken
      ) {
        if (ts.isIdentifier(node.operand)) {
          mutated.add(node.operand.text);
        }
      }
    }

    // Delete is also a mutation: `delete obj.prop`
    if (ts.isDeleteExpression(node)) {
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        mutated.add(node.expression.expression.text);
      } else if (
        ts.isElementAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        mutated.add(node.expression.expression.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  // Unwrap the root function so we visit its body, not the function wrapper itself
  let target: ts.Node = expression;
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    target = expression.body;
  }

  visit(target);
  return uncertain ? null : Array.from(mutated);
}

/* ------------------------------------------------------------------ */
// Patch grouping for fine-grained update()
/* ------------------------------------------------------------------ */

export type PatchGroup = {
  code: string;
  vars: string[];
};

/**
 * Group patches by the mutable local variables they depend on.
 * Patches with no local variable dependencies go into the `__all` group.
 */
export function groupPatches(
  patches: { code: string; deps: string[] }[],
  localVars: Set<string>,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const patch of patches) {
    const ids = extractIdentifiers(patch.code);
    const vars = ids.filter((id) => localVars.has(id));

    if (vars.length === 0) {
      // No local dependencies — only runs on full update
      const arr = groups.get('__all') ?? [];
      arr.push(patch.code);
      groups.set('__all', arr);
    } else {
      // Add to each variable's group
      for (const v of vars) {
        const arr = groups.get(v) ?? [];
        arr.push(patch.code);
        groups.set(v, arr);
      }
    }
  }

  return groups;
}

/**
 * Generate conditional update code from patch groups.
 *
 * Each group becomes a guarded block. The `__all` group always runs.
 * When `__dirty.size === 0` (initial render / parent invalidation),
 * every group runs.
 */
export function buildConditionalUpdate(
  groups: Map<string, string[]>,
): string {
  const varGroups = Array.from(groups.entries()).filter(([k]) => k !== '__all');
  const allPatches = groups.get('__all') ?? [];

  const lines: string[] = [];
  lines.push('const _all = __dirty.size === 0 || __dirty.has(\'__all\');');

  // De-dupe: track which patch codes we've already emitted
  const emitted = new Set<string>();

  // Emit variable groups
  for (const [varName, patchCodes] of varGroups) {
    lines.push(`const _${varName} = _all || __dirty.delete('${varName}');`);
    lines.push(`if (_${varName}) {`);
    for (const code of patchCodes) {
      if (!emitted.has(code)) {
        lines.push(`  ${code}`);
        emitted.add(code);
      }
    }
    lines.push(`}`);
  }

  // Emit __all group
  if (allPatches.length > 0) {
    lines.push(`if (_all) {`);
    for (const code of allPatches) {
      if (!emitted.has(code)) {
        lines.push(`  ${code}`);
        emitted.add(code);
      }
    }
    lines.push(`}`);
  }

  lines.push('__dirty.clear();');

  return lines.map((l) => `          ${l}`).join('\n');
}
