/**
 * @fileoverview Automatic JSX runtime entry (development).
 *
 * Provides `jsxDEV` for the automatic JSX transform in dev mode.
 */

import { Fragment as Frag } from './index';
import { jsx } from './runtime';

export const Fragment = Frag;

/**
 * Development JSX runtime entry used by bundlers in dev mode.
 * Extra parameters are ignored; we delegate to the `jsx` implementation.
 */
export function jsxDEV(
  type: any,
  props: any = {},
  key?: any,
  isStaticChildren?: boolean,
  source?: any,
  self?: any
): any {
  return jsx(type, props, key);
}
