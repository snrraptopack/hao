import type { LengthProperty, GlobalCssValues } from './positioning';

export type SizingProperty =
  | 'auto' | 'min-content' | 'max-content' | 'fit-content' | 'stretch' | 'contain'
  | LengthProperty | GlobalCssValues
  | (string & {});

export type MinMaxSizingProperty = 'none' | SizingProperty;

export type ObjectFitValue = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down' | GlobalCssValues | (string & {});

export type ImageRenderingValue = 'auto' | 'crisp-edges' | 'pixelated' | GlobalCssValues | (string & {});

export interface SizingProperties {
  width?: SizingProperty;
  height?: SizingProperty;
  minWidth?: MinMaxSizingProperty;
  maxWidth?: MinMaxSizingProperty;
  minHeight?: MinMaxSizingProperty;
  maxHeight?: MinMaxSizingProperty;
  aspectRatio?: 'auto' | string | number | GlobalCssValues;
  objectFit?: ObjectFitValue;
  objectPosition?: string | GlobalCssValues;
  imageRendering?: ImageRenderingValue;
}
