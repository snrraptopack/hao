/**
 * @fileoverview Automatic JSX runtime entry (development).
 *
 * Provides `jsxDEV` for the automatic JSX transform in dev mode.
 */

import { Fragment as Frag } from './index';
import { jsx } from './runtime';
import type { JSX } from './types';

export const Fragment = Frag;

/**
 * Development JSX runtime entry used by bundlers in dev mode.
 * Extra parameters are ignored; we delegate to the `jsx` implementation.
 */
export function jsxDEV(
  type: any,
  props: any = {},
  key?: any,
  _isStaticChildren?: boolean,
  _source?: any,
  _self?: any
): JSX.Element {
  return jsx(type, props, key);
}

export type { JSX } from './types';
