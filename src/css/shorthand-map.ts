/**
 * @file shorthand-map.ts
 * @description
 * Dictionary mapping developer experience (DX) shorthands to standard
 * camelCase CSS property names.
 */

export const SHORTHAND_MAP: Record<string, string> = {
  // Layout & Positioning
  d: 'display',
  pos: 'position',
  t: 'top',
  r: 'right',
  b: 'bottom',
  l: 'left',
  z: 'zIndex',

  // Sizing
  w: 'width',
  h: 'height',
  minW: 'minWidth',
  maxW: 'maxWidth',
  minH: 'minHeight',
  maxH: 'maxHeight',

  // Spacing
  m: 'margin',
  mt: 'marginTop',
  mr: 'marginRight',
  mb: 'marginBottom',
  ml: 'marginLeft',
  mx: 'marginInline',
  my: 'marginBlock',
  p: 'padding',
  pt: 'paddingTop',
  pr: 'paddingRight',
  pb: 'paddingBottom',
  pl: 'paddingLeft',
  px: 'paddingInline',
  py: 'paddingBlock',

  // Flex & Grid Shorthands
  jc: 'justifyContent',
  ai: 'alignItems',
  ac: 'alignContent',
  ji: 'justifyItems',
  as: 'alignSelf',
  js: 'justifySelf',
  g: 'gap',
  rg: 'rowGap',
  cg: 'columnGap',

  // Cosmetics & Colors
  bg: 'background',
  bgc: 'backgroundColor',
  c: 'color',
  op: 'opacity',
  bsh: 'boxShadow',
  tsh: 'textShadow',

  // Borders
  bc: 'borderColor',
  bw: 'borderWidth',
  bs: 'borderStyle',
  br: 'borderRadius',

  // Typography
  ff: 'fontFamily',
  fs: 'fontSize',
  fw: 'fontWeight',
  lh: 'lineHeight',
  ta: 'textAlign',
  td: 'textDecoration',
  tt: 'textTransform',
  ws: 'whiteSpace',
  to: 'textOverflow',

  // Effects & Interactions
  anim: 'animation',
  trans: 'transition',
  pe: 'pointerEvents',
  us: 'userSelect',
  v: 'visibility'
};
