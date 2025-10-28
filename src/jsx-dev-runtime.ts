import { Fragment as Frag } from './jsx';
import { jsx } from './jsx-runtime';

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