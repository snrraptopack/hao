/**
 * @fileoverview Shared constants used across runtime and compiler-runtime layers.
 */

/** Sentinel value indicating a node has no matching index in the old child list. */
export const NO_INDEX = -1;

/**
 * Comment-anchor payload marking a dynamic child position in compiled output.
 * Emitted by the compiler (`__hydrateComment`, SSR `<!--auwla:child-->`) and
 * consumed by the hydration cursor in `compiler-runtime/template.ts`.
 */
export const ANCHOR_CHILD = 'auwla:child';

/**
 * Comment-anchor payload marking a keyed-map row region in compiled output.
 * Same contract as {@link ANCHOR_CHILD} for `__keyedMap` blocks.
 */
export const ANCHOR_KEYED_MAP = 'auwla:keyed-map';

/**
 * HTML attributes that are present/absent booleans rather than key="value"
 * pairs. Shared by template/SSR attribute codegen and the SSR stringifier.
 */
export const BOOLEAN_HTML_ATTRS: ReadonlySet<string> = new Set([
  'checked',
  'disabled',
  'hidden',
  'multiple',
  'readonly',
  'required',
  'selected',
]);
