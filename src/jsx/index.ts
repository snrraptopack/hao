/**
 * @fileoverview JSX runtime facade.
 *
 * Exposes `h`, `Fragment`, and DOM helper types used by the automatic
 * JSX runtime entries.
 */

export { Fragment, createMemoElement, h } from '../runtime/index';
export type { MemoChild, MemoProps } from '../runtime/index';
