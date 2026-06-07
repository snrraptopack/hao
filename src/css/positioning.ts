import type { Length, CalcExpression } from './types';
import type { FlexDescriptor, GridDescriptor } from './layout';

export type GlobalCssValues = 'inherit' | 'initial' | 'revert' | 'revert-layer' | 'unset';

export type DisplayMode = 
  | 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' 
  | 'flow-root' | 'none' | 'contents' | 'table' | 'table-cell' | 'list-item' | GlobalCssValues
  | (string & {});

export type PositionMode = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' | GlobalCssValues | (string & {});

export type LengthProperty =
  | Length
  | CalcExpression
  | string
  | number
  | ReadonlyArray<Length | CalcExpression | string | number>;

export type OverflowValue = 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto' | GlobalCssValues | (string & {});

export interface PositioningProperties {
  display?: DisplayMode | FlexDescriptor | GridDescriptor;
  position?: PositionMode;
  top?: LengthProperty;
  right?: LengthProperty;
  bottom?: LengthProperty;
  left?: LengthProperty;
  inset?: LengthProperty;
  zIndex?: number | 'auto' | GlobalCssValues;
  containerType?: 'size' | 'inline-size' | 'normal' | GlobalCssValues;
  containerName?: string | GlobalCssValues;
  isolation?: 'auto' | 'isolate' | GlobalCssValues;
  overflow?: OverflowValue;
  overflowX?: OverflowValue;
  overflowY?: OverflowValue;
}
