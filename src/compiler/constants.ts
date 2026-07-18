/**
 * @fileoverview Shared constant tables for the Auwla compiler.
 *
 * These sets are consulted by several analysis passes (derived-state
 * detection, dirty-source narrowing, row dependency inference). They used to
 * be copy-pasted per file and had already drifted apart once — keep the
 * single copy here.
 */

import ts from 'typescript';

/**
 * Binary operator tokens that assign or mutate in place: `=` plus every
 * compound assignment operator. Used by the mutation-analysis passes
 * (auto-commit wrapping, derived-state purity, dirty-mark analysis).
 * Single copy — there were six (M8).
 */
export const ASSIGNMENT_TOKENS: ReadonlySet<ts.SyntaxKind> = new Set([
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

/** `++` / `--` unary mutation operators (companion to ASSIGNMENT_TOKENS). */
export const INC_DEC_TOKENS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken,
]);

/**
 * Identifiers that resolve to JS/DOM globals rather than component-local
 * state. Roots in this set are never treated as dependencies.
 */
export const GLOBAL_IDENTIFIERS: ReadonlySet<string> = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'console', 'window', 'document', 'Math', 'JSON', 'Date', 'String', 'Number',
  'Array', 'Object', 'RegExp', 'Error', 'Promise', 'Set', 'Map',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
]);

/**
 * Compiler-emitted helper names. Passes that analyze *generated* code (e.g.
 * derived-state expansion over already-lowered expressions) must treat these
 * as globals too.
 */
export const COMPILER_HELPER_IDENTIFIERS: ReadonlySet<string> = new Set([
  '__event', '__componentBlock', '__createBlock', '__createBlockSimple', '__setText',
  '__setElementText', '__setClass', '__setProperty', '__setAttribute',
  '__setStyle', '__setChild', '__spreadProps', '__keyedMap', '__cloneTemplate',
  '__computed',
]);

/** GLOBAL_IDENTIFIERS plus compiler-emitted helpers, for generated-code analysis. */
export const GLOBALS_WITH_HELPERS: ReadonlySet<string> = new Set([
  ...GLOBAL_IDENTIFIERS,
  ...COMPILER_HELPER_IDENTIFIERS,
]);
