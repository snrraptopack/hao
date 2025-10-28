import { h, Fragment as Frag } from './jsx';

export const Fragment = Frag;

/**
 * Automatic JSX runtime entry: single-child optimization.
 * Maps props.children to variadic children for Auwla's `h`.
 */
export function jsx(type: any, props: any = {}, key?: any): any {
  if (key !== undefined && props && props.key === undefined) {
    props = { ...props, key };
  }
  const c = props?.children;
  if (c === undefined) return h(type, props);
  if (Array.isArray(c)) return h(type, props, ...c);
  return h(type, props, c);
}

/**
 * Automatic JSX runtime entry: multi-children path.
 * Delegates to `jsx` since we normalize children above.
 */
export const jsxs = jsx;