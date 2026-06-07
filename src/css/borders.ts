import type { Border, Color } from './types';
import type { LengthProperty, GlobalCssValues } from './positioning';

export type ColorProperty = Color | string;

export type BorderStyleValue = 
  | 'none' | 'hidden' | 'solid' | 'dashed' | 'dotted' | 'double' 
  | 'groove' | 'ridge' | 'inset' | 'outset' | GlobalCssValues
  | (string & {});

export type BorderWidthValue = LengthProperty | 'thin' | 'medium' | 'thick' | GlobalCssValues | (string & {});

export interface BorderProperties {
  border?: Border | string;
  borderWidth?: BorderWidthValue;
  borderStyle?: BorderStyleValue;
  borderColor?: ColorProperty | 'transparent' | GlobalCssValues;
  borderRadius?: LengthProperty | GlobalCssValues;

  // Sides
  borderTop?: Border | string;
  borderRight?: Border | string;
  borderBottom?: Border | string;
  borderLeft?: Border | string;
  
  // Logical sides
  borderBlock?: Border | string;
  borderBlockStart?: Border | string;
  borderBlockEnd?: Border | string;
  borderInline?: Border | string;
  borderInlineStart?: Border | string;
  borderInlineEnd?: Border | string;

  // Logical widths & colors
  borderBlockStartWidth?: BorderWidthValue;
  borderBlockEndWidth?: BorderWidthValue;
  borderInlineStartWidth?: BorderWidthValue;
  borderInlineEndWidth?: BorderWidthValue;
  borderBlockStartColor?: ColorProperty | 'transparent' | GlobalCssValues;
  borderBlockEndColor?: ColorProperty | 'transparent' | GlobalCssValues;
  borderInlineStartColor?: ColorProperty | 'transparent' | GlobalCssValues;
  borderInlineEndColor?: ColorProperty | 'transparent' | GlobalCssValues;

  // Logical corners
  borderStartStartRadius?: LengthProperty | GlobalCssValues;
  borderStartEndRadius?: LengthProperty | GlobalCssValues;
  borderEndStartRadius?: LengthProperty | GlobalCssValues;
  borderEndEndRadius?: LengthProperty | GlobalCssValues;

  // Physical corners
  borderTopLeftRadius?: LengthProperty | GlobalCssValues;
  borderTopRightRadius?: LengthProperty | GlobalCssValues;
  borderBottomLeftRadius?: LengthProperty | GlobalCssValues;
  borderBottomRightRadius?: LengthProperty | GlobalCssValues;

  // Outlines
  outline?: { outline: string; outlineOffset?: string; toString(): string } | Border | string;
  outlineColor?: ColorProperty | 'transparent' | GlobalCssValues;
  outlineStyle?: BorderStyleValue;
  outlineWidth?: BorderWidthValue;
  outlineOffset?: LengthProperty | GlobalCssValues;
}
