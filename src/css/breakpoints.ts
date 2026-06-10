/**
 * @file breakpoints.ts
 * @description
 * Shared responsive breakpoints for the Auwla CSS package.
 */

/** All breakpoint names recognized by the responsive value system. */
export const BREAKPOINT_KEYS = new Set(['base', 'sm', 'md', 'lg', 'xl', '2xl']);

export const BREAKPOINTS: Record<string, string> = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};
