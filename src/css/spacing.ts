import type { LengthProperty, GlobalCssValues } from './positioning';

export interface SpacingProperties {
  margin?: LengthProperty | 'auto' | GlobalCssValues;
  marginTop?: LengthProperty | 'auto' | GlobalCssValues;
  marginRight?: LengthProperty | 'auto' | GlobalCssValues;
  marginBottom?: LengthProperty | 'auto' | GlobalCssValues;
  marginLeft?: LengthProperty | 'auto' | GlobalCssValues;
  
  // Logical Margins
  marginBlock?: LengthProperty | 'auto' | GlobalCssValues;
  marginBlockStart?: LengthProperty | 'auto' | GlobalCssValues;
  marginBlockEnd?: LengthProperty | 'auto' | GlobalCssValues;
  marginInline?: LengthProperty | 'auto' | GlobalCssValues;
  marginInlineStart?: LengthProperty | 'auto' | GlobalCssValues;
  marginInlineEnd?: LengthProperty | 'auto' | GlobalCssValues;

  padding?: LengthProperty | GlobalCssValues;
  paddingTop?: LengthProperty | GlobalCssValues;
  paddingRight?: LengthProperty | GlobalCssValues;
  paddingBottom?: LengthProperty | GlobalCssValues;
  paddingLeft?: LengthProperty | GlobalCssValues;
  
  // Logical Paddings
  paddingBlock?: LengthProperty | GlobalCssValues;
  paddingBlockStart?: LengthProperty | GlobalCssValues;
  paddingBlockEnd?: LengthProperty | GlobalCssValues;
  paddingInline?: LengthProperty | GlobalCssValues;
  paddingInlineStart?: LengthProperty | GlobalCssValues;
  paddingInlineEnd?: LengthProperty | GlobalCssValues;
}
