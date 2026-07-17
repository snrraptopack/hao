/**
 * @fileoverview Shared constant tables for the Auwla compiler.
 *
 * These sets are consulted by several analysis passes (derived-state
 * detection, dirty-source narrowing, row dependency inference). They used to
 * be copy-pasted per file and had already drifted apart once — keep the
 * single copy here.
 */

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
