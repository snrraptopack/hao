import type { LengthProperty, GlobalCssValues } from './positioning';

export type ScrollBehaviorValue = 'auto' | 'smooth' | GlobalCssValues | (string & {});

export type OverscrollBehaviorValue = 'auto' | 'contain' | 'none' | GlobalCssValues | (string & {});

export type ScrollSnapAlignValue = 'none' | 'start' | 'end' | 'center' | 'start end' | 'start center' | 'end start' | 'end center' | 'center start' | 'center end' | GlobalCssValues | (string & {});

export type ScrollSnapStopValue = 'normal' | 'always' | GlobalCssValues | (string & {});

export interface ScrollProperties {
  scrollBehavior?: ScrollBehaviorValue;
  
  overscrollBehavior?: OverscrollBehaviorValue;
  overscrollBehaviorX?: OverscrollBehaviorValue;
  overscrollBehaviorY?: OverscrollBehaviorValue;
  
  scrollSnapType?: string | GlobalCssValues;
  scrollSnapAlign?: ScrollSnapAlignValue;
  scrollSnapStop?: ScrollSnapStopValue;
  
  scrollMargin?: LengthProperty | GlobalCssValues;
  scrollMarginTop?: LengthProperty | GlobalCssValues;
  scrollMarginRight?: LengthProperty | GlobalCssValues;
  scrollMarginBottom?: LengthProperty | GlobalCssValues;
  scrollMarginLeft?: LengthProperty | GlobalCssValues;
  
  scrollPadding?: LengthProperty | GlobalCssValues;
  scrollPaddingTop?: LengthProperty | GlobalCssValues;
  scrollPaddingRight?: LengthProperty | GlobalCssValues;
  scrollPaddingBottom?: LengthProperty | GlobalCssValues;
  scrollPaddingLeft?: LengthProperty | GlobalCssValues;
}
