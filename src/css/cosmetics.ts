import type { Color, Gradient, Shadow } from './types';
import type { ColorProperty } from './borders';
import type { GlobalCssValues } from './positioning';

export type CursorValue =
  | 'auto' | 'default' | 'none' | 'context-menu' | 'help' | 'pointer' | 'progress' | 'wait'
  | 'cell' | 'crosshair' | 'text' | 'vertical-text' | 'alias' | 'copy' | 'move' | 'no-drop'
  | 'not-allowed' | 'grab' | 'grabbing' | 'all-scroll' | 'col-resize' | 'row-resize'
  | GlobalCssValues | (string & {});

export type PointerEventsValue = 'auto' | 'none' | GlobalCssValues | (string & {});

export type UserSelectValue = 'none' | 'auto' | 'text' | 'contain' | 'all' | GlobalCssValues | (string & {});

export type VisibilityValue = 'visible' | 'hidden' | 'collapse' | GlobalCssValues | (string & {});

export interface CosmeticsProperties {
  background?: Color | Gradient | string | GlobalCssValues;
  backgroundColor?: ColorProperty | GlobalCssValues;
  accentColor?: ColorProperty | GlobalCssValues;
  color?: ColorProperty | GlobalCssValues;
  fill?: ColorProperty | GlobalCssValues;
  opacity?: number | string | GlobalCssValues;
  stroke?: ColorProperty | GlobalCssValues;
  boxShadow?: Shadow | string | GlobalCssValues;
  textShadow?: Shadow | string | GlobalCssValues;
  cursor?: CursorValue;
  pointerEvents?: PointerEventsValue;
  userSelect?: UserSelectValue;
  visibility?: VisibilityValue;
  mixBlendMode?: string | GlobalCssValues;

  // Filters, Clipping & Masking (Visual Effects)
  filter?: string | GlobalCssValues;
  backdropFilter?: string | GlobalCssValues;
  clipPath?: string | GlobalCssValues;
  mask?: string | GlobalCssValues;
  maskImage?: string | GlobalCssValues;
  maskSize?: string | GlobalCssValues;
  maskPosition?: string | GlobalCssValues;
  maskRepeat?: string | GlobalCssValues;
}
