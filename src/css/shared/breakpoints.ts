/**
 * @file shared/breakpoints.ts
 * @description
 * Shared breakpoint parsing and media-query construction used by both
 * runtime (compose.ts) and compiler (evaluator.ts).
 */

import { BREAKPOINTS } from '../breakpoints';

export interface ParsedBreakpoint {
  value: number;
  unit: string;
}

/**
 * Parse a breakpoint string like '768px' into value and unit.
 * Falls back to the BREAKPOINTS registry for named breakpoints.
 */
export function getBreakpointValue(bp: string): ParsedBreakpoint | null {
  const raw = BREAKPOINTS[bp] || bp;
  const match = raw.match(/^(\d+(?:\.\d+)?)([a-zA-Z%]+)$/);
  if (match && match[1] !== undefined && match[2] !== undefined) {
    return { value: parseFloat(match[1]), unit: match[2] };
  }
  return null;
}

/** Build a `@media (min-width: ...)` query. */
export function above(bp: string): string {
  const parsed = getBreakpointValue(bp);
  if (parsed) {
    return `@media (min-width: ${parsed.value}${parsed.unit})`;
  }
  return `@media (min-width: ${bp})`;
}

/** Build a `@media (max-width: ...)` query. */
export function below(bp: string): string {
  const parsed = getBreakpointValue(bp);
  if (parsed) {
    const subtractVal = parsed.unit === 'px' ? 0.02 : 0.01;
    const maxVal = Number((parsed.value - subtractVal).toFixed(3));
    return `@media (max-width: ${maxVal}${parsed.unit})`;
  }
  return `@media (max-width: ${bp})`;
}

/** Build a `@media (min-width: ... and max-width: ...)` query for a single breakpoint range. */
export function matchBreakpoint(bp: string): string {
  const parsedMin = getBreakpointValue(bp);
  if (!parsedMin) {
    return `@media (min-width: ${bp})`;
  }

  const keys = Object.keys(BREAKPOINTS);
  const idx = keys.indexOf(bp);
  if (idx !== -1 && idx < keys.length - 1) {
    const nextBp = keys[idx + 1];
    if (nextBp) {
      const parsedMax = getBreakpointValue(nextBp);
      if (parsedMax) {
        const subtractVal = parsedMax.unit === 'px' ? 0.02 : 0.01;
        const maxVal = Number((parsedMax.value - subtractVal).toFixed(3));
        return `@media (min-width: ${parsedMin.value}${parsedMin.unit}) and (max-width: ${maxVal}${parsedMax.unit})`;
      }
    }
  }

  return `@media (min-width: ${parsedMin.value}${parsedMin.unit})`;
}

/** Build a `@media (min-width: ... and max-width: ...)` query between two breakpoints. */
export function between(minBp: string, maxBp: string): string {
  const parsedMin = getBreakpointValue(minBp);
  const parsedMax = getBreakpointValue(maxBp);

  const minStr = parsedMin ? `${parsedMin.value}${parsedMin.unit}` : minBp;

  if (parsedMax) {
    const subtractVal = parsedMax.unit === 'px' ? 0.02 : 0.01;
    const maxVal = Number((parsedMax.value - subtractVal).toFixed(3));
    return `@media (min-width: ${minStr}) and (max-width: ${maxVal}${parsedMax.unit})`;
  }

  return `@media (min-width: ${minStr}) and (max-width: ${maxBp})`;
}
