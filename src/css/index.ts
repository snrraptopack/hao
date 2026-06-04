/**
 * @file index.ts
 * @description
 * Public barrel for the auwla/css package.
 *
 * Consumers import from 'auwla/css':
 *   import { css } from 'auwla/css'
 *
 * Individual type exports are also available for advanced usage
 * (e.g. annotating function parameters with Length, Color, etc.).
 */

// Main API object
export { css } from './css';

// Types — re-exported for consumers who want to type function parameters
export type {
  Angle,
  Border,
  CalcExpression,
  ClampExpression,
  Color,
  CSSValue,
  FlexDescriptor,
  Gradient,
  GridDescriptor,
  Length,
  ResolvedStyle,
  Shadow,
  StyleObject,
  Time,
  Transform,
  Transition,
  TransitionEntry,
} from './types';
