import type { LengthProperty, GlobalCssValues } from './positioning';

export type FontStyleValue = 'normal' | 'italic' | 'oblique' | GlobalCssValues | (string & {});

export type FontWeightValue = 
  | 'normal' | 'bold' | 'bolder' | 'lighter' 
  | number | GlobalCssValues | (string & {});

export type TextAlignValue = 
  | 'start' | 'end' | 'left' | 'right' | 'center' | 'justify' | 'justify-all' | 'match-parent'
  | GlobalCssValues | (string & {});

export type TextDecorationLineValue = 
  | 'none' | 'underline' | 'overline' | 'line-through' | 'blink'
  | GlobalCssValues | (string & {});

export type TextDecorationStyleValue = 
  | 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy'
  | GlobalCssValues | (string & {});

export type TextTransformValue = 
  | 'none' | 'capitalize' | 'uppercase' | 'lowercase' | 'full-width' | 'full-size-kana'
  | GlobalCssValues | (string & {});

export type WhiteSpaceValue = 
  | 'normal' | 'pre' | 'nowrap' | 'pre-wrap' | 'pre-line' | 'break-spaces'
  | GlobalCssValues | (string & {});

export type WordBreakValue = 
  | 'normal' | 'break-all' | 'keep-all' | 'break-word'
  | GlobalCssValues | (string & {});

export type TextOverflowValue = 
  | 'clip' | 'ellipsis' | GlobalCssValues | (string & {});

export type ListStyleTypeValue = 
  | 'disc' | 'circle' | 'square' | 'decimal' | 'decimal-leading-zero' 
  | 'lower-roman' | 'upper-roman' | 'lower-greek' | 'lower-latin' | 'upper-latin' 
  | 'armenian' | 'georgian' | 'none' | GlobalCssValues | (string & {});

export type WritingModeValue = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr' | GlobalCssValues | (string & {});

export type UnicodeBidiValue = 
  | 'normal' | 'embed' | 'bidi-override' | 'isolate' | 'isolate-override' | 'plaintext' 
  | GlobalCssValues | (string & {});

export interface TypographyProperties {
  fontFamily?: string | GlobalCssValues;
  fontSize?: LengthProperty | GlobalCssValues;
  fontStyle?: FontStyleValue;
  fontWeight?: FontWeightValue;
  letterSpacing?: LengthProperty | GlobalCssValues;
  lineHeight?: LengthProperty | number | GlobalCssValues;
  textAlign?: TextAlignValue;
  textDecoration?: string | GlobalCssValues;
  textDecorationLine?: TextDecorationLineValue;
  textDecorationStyle?: TextDecorationStyleValue;
  textDecorationColor?: string | GlobalCssValues;
  textTransform?: TextTransformValue;
  wordSpacing?: LengthProperty | GlobalCssValues;
  whiteSpace?: WhiteSpaceValue;
  wordBreak?: WordBreakValue;
  textOverflow?: TextOverflowValue;

  // List Styling
  listStyle?: string | GlobalCssValues;
  listStyleType?: ListStyleTypeValue;
  listStylePosition?: 'inside' | 'outside' | GlobalCssValues;
  listStyleImage?: string | GlobalCssValues;

  // Writing Mode & Directionality
  writingMode?: WritingModeValue;
  direction?: 'ltr' | 'rtl' | GlobalCssValues;
  unicodeBidi?: UnicodeBidiValue;
}
