import type { Length, CalcExpression } from './types';

export type GlobalCssValues = 'inherit' | 'initial' | 'revert' | 'revert-layer' | 'unset';

// --- Flexbox Types ---
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse' | GlobalCssValues | (string & {});
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse' | GlobalCssValues | (string & {});
export type FlexFlow = string | GlobalCssValues;

export type JustifyContent = 
  | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  | 'start' | 'end' | 'left' | 'right' | 'stretch' | GlobalCssValues
  | (string & {});

export type AlignItems = 
  | 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline'
  | 'start' | 'end' | 'self-start' | 'self-end' | GlobalCssValues
  | (string & {});

export type AlignContent = 
  | 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  | 'start' | 'end' | 'baseline' | 'first baseline' | 'last baseline' | GlobalCssValues
  | (string & {});

export type FlexGap = Length | CalcExpression | string | number;

export type FlexOptions = {
  // Container Properties
  inline?: boolean;
  direction?: FlexDirection;
  wrap?: boolean | 'reverse' | FlexWrap;
  flow?: FlexFlow;
  justify?: JustifyContent;
  align?: AlignItems;
  alignContent?: AlignContent;
  gap?: FlexGap;
  rowGap?: FlexGap;
  columnGap?: FlexGap;

  // Item Properties
  order?: number | GlobalCssValues;
  grow?: number | GlobalCssValues;
  shrink?: number | GlobalCssValues;
  basis?: Length | CalcExpression | 'auto' | 'content' | 'max-content' | 'min-content' | 'fit-content' | string | number | GlobalCssValues;
  flex?: string | number | GlobalCssValues;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch' | 'start' | 'end' | 'self-start' | 'self-end' | GlobalCssValues | (string & {});
};

export interface FlexDescriptor {
  readonly _tag: 'Flex';
  readonly options: FlexOptions;
  toProperties(): Record<string, string>;
}

// --- Grid Types ---
export type GridTemplateTrack = Length | CalcExpression | 'auto' | 'min-content' | 'max-content' | string | number;

export type GridOptions = {
  // Container Properties
  inline?: boolean;
  
  // Track Definition
  columns?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  rows?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  areas?: string | Array<Array<string>> | GlobalCssValues;
  template?: string | GlobalCssValues;
  
  // Gap
  gap?: FlexGap;
  rowGap?: FlexGap;
  columnGap?: FlexGap;

  // Alignment
  justifyItems?: 'stretch' | 'start' | 'end' | 'center' | 'left' | 'right' | 'baseline' | 'first baseline' | 'last baseline' | string | GlobalCssValues;
  alignItems?: 'stretch' | 'start' | 'end' | 'center' | 'baseline' | 'first baseline' | 'last baseline' | string | GlobalCssValues;
  placeItems?: string | GlobalCssValues;
  justifyContent?: 'stretch' | 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'left' | 'right' | GlobalCssValues;
  alignContent?: 'stretch' | 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'baseline' | 'first baseline' | 'last baseline' | GlobalCssValues;
  placeContent?: string | GlobalCssValues;

  // Auto-flow & Implicit Grid
  autoColumns?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  autoRows?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  autoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense' | GlobalCssValues;

  // Item Properties
  columnStart?: number | string | GlobalCssValues;
  columnEnd?: number | string | GlobalCssValues;
  rowStart?: number | string | GlobalCssValues;
  rowEnd?: number | string | GlobalCssValues;
  column?: string | number | GlobalCssValues;
  row?: string | number | GlobalCssValues;
  area?: string | GlobalCssValues;
  justifySelf?: 'auto' | 'stretch' | 'start' | 'end' | 'center' | 'baseline' | 'left' | 'right' | string | GlobalCssValues;
  alignSelf?: 'auto' | 'stretch' | 'start' | 'end' | 'center' | 'baseline' | string | GlobalCssValues;
  placeSelf?: string | GlobalCssValues;
};

export interface GridDescriptor {
  readonly _tag: 'Grid';
  readonly options: GridOptions;
  toProperties(): Record<string, string>;
}

import { formatLength } from './shared/length';

// --- Serializers ---

export function flexProperties(options: FlexOptions): Record<string, string> {
  const props: Record<string, string> = {
    display: options.inline ? 'inline-flex' : 'flex'
  };

  if (options.direction) props['flexDirection'] = options.direction;

  if (options.wrap !== undefined) {
    if (options.wrap === true) props['flexWrap'] = 'wrap';
    else if (options.wrap === 'reverse') props['flexWrap'] = 'wrap-reverse';
    else if (options.wrap === false) props['flexWrap'] = 'nowrap';
    else props['flexWrap'] = String(options.wrap);
  }

  if (options.flow) props['flexFlow'] = options.flow;
  if (options.justify) props['justifyContent'] = options.justify;
  if (options.align) props['alignItems'] = options.align;
  if (options.alignContent) props['alignContent'] = options.alignContent;
  
  if (options.gap !== undefined) props['gap'] = formatLength(options.gap);
  if (options.rowGap !== undefined) props['rowGap'] = formatLength(options.rowGap);
  if (options.columnGap !== undefined) props['columnGap'] = formatLength(options.columnGap);

  if (options.order !== undefined) props['order'] = String(options.order);
  if (options.grow !== undefined) props['flexGrow'] = String(options.grow);
  if (options.shrink !== undefined) props['flexShrink'] = String(options.shrink);
  if (options.basis !== undefined) props['flexBasis'] = formatLength(options.basis);
  if (options.flex) props['flex'] = String(options.flex);
  if (options.alignSelf) props['alignSelf'] = options.alignSelf;

  return props;
}

export function gridProperties(options: GridOptions): Record<string, string> {
  const props: Record<string, string> = {
    display: options.inline ? 'inline-grid' : 'grid'
  };

  if (options.columns !== undefined) {
    props['gridTemplateColumns'] = Array.isArray(options.columns)
      ? options.columns.map(formatLength).join(' ')
      : formatLength(options.columns);
  }

  if (options.rows !== undefined) {
    props['gridTemplateRows'] = Array.isArray(options.rows)
      ? options.rows.map(formatLength).join(' ')
      : formatLength(options.rows);
  }

  if (options.areas !== undefined) {
    props['gridTemplateAreas'] = Array.isArray(options.areas)
      ? options.areas.map(row => Array.isArray(row) ? `"${row.join(' ')}"` : String(row)).join(' ')
      : String(options.areas);
  }

  if (options.template) props['gridTemplate'] = options.template;

  if (options.gap !== undefined) props['gap'] = formatLength(options.gap);
  if (options.rowGap !== undefined) props['rowGap'] = formatLength(options.rowGap);
  if (options.columnGap !== undefined) props['columnGap'] = formatLength(options.columnGap);

  if (options.justifyItems) props['justifyItems'] = options.justifyItems;
  if (options.alignItems) props['alignItems'] = options.alignItems;
  if (options.placeItems) props['placeItems'] = options.placeItems;
  if (options.justifyContent) props['justifyContent'] = options.justifyContent;
  if (options.alignContent) props['alignContent'] = options.alignContent;
  if (options.placeContent) props['placeContent'] = options.placeContent;

  if (options.autoColumns !== undefined) {
    props['gridAutoColumns'] = Array.isArray(options.autoColumns)
      ? options.autoColumns.map(formatLength).join(' ')
      : formatLength(options.autoColumns);
  }

  if (options.autoRows !== undefined) {
    props['gridAutoRows'] = Array.isArray(options.autoRows)
      ? options.autoRows.map(formatLength).join(' ')
      : formatLength(options.autoRows);
  }

  if (options.autoFlow) props['gridAutoFlow'] = options.autoFlow;

  if (options.columnStart !== undefined) props['gridColumnStart'] = String(options.columnStart);
  if (options.columnEnd !== undefined) props['gridColumnEnd'] = String(options.columnEnd);
  if (options.rowStart !== undefined) props['gridRowStart'] = String(options.rowStart);
  if (options.rowEnd !== undefined) props['gridRowEnd'] = String(options.rowEnd);
  if (options.column !== undefined) props['gridColumn'] = String(options.column);
  if (options.row !== undefined) props['gridRow'] = String(options.row);
  if (options.area) props['gridArea'] = options.area;
  if (options.justifySelf) props['justifySelf'] = options.justifySelf;
  if (options.alignSelf) props['alignSelf'] = options.alignSelf;
  if (options.placeSelf) props['placeSelf'] = options.placeSelf;

  return props;
}

// --- Factory functions ---
export function flex(options: FlexOptions): FlexDescriptor {
  return {
    _tag: 'Flex',
    options,
    toProperties() {
      return flexProperties(options);
    }
  };
}

export function grid(options: GridOptions): GridDescriptor {
  return {
    _tag: 'Grid',
    options,
    toProperties() {
      return gridProperties(options);
    }
  };
}

export interface FlexGridProperties {
  alignContent?: AlignContent;
  alignItems?: AlignItems;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch' | 'start' | 'end' | 'self-start' | 'self-end' | GlobalCssValues | (string & {});
  columnGap?: FlexGap;
  flex?: FlexDescriptor | string | number | GlobalCssValues;
  flexBasis?: Length | CalcExpression | 'auto' | 'content' | 'max-content' | 'min-content' | 'fit-content' | string | number | GlobalCssValues;
  flexDirection?: FlexDirection;
  flexGrow?: number | GlobalCssValues;
  flexShrink?: number | GlobalCssValues;
  flexWrap?: FlexWrap;
  gap?: FlexGap;
  grid?: GridDescriptor | string;
  gridArea?: string | GlobalCssValues;
  gridAutoColumns?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  gridAutoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense' | GlobalCssValues;
  gridAutoRows?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  gridColumn?: string | number | GlobalCssValues;
  gridColumnEnd?: number | string | GlobalCssValues;
  gridColumnStart?: number | string | GlobalCssValues;
  gridRow?: string | number | GlobalCssValues;
  gridRowEnd?: number | string | GlobalCssValues;
  gridRowStart?: number | string | GlobalCssValues;
  gridTemplateAreas?: string | GlobalCssValues;
  gridTemplateColumns?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  gridTemplateRows?: GridTemplateTrack | Array<GridTemplateTrack> | GlobalCssValues;
  justifyContent?: JustifyContent;
  justifyItems?: 'stretch' | 'start' | 'end' | 'center' | 'left' | 'right' | 'baseline' | 'first baseline' | 'last baseline' | string | GlobalCssValues;
  justifySelf?: 'auto' | 'stretch' | 'start' | 'end' | 'center' | 'baseline' | 'left' | 'right' | string | GlobalCssValues;
  rowGap?: FlexGap;

  // Multi-column Layout
  columns?: string | number | GlobalCssValues;
  columnCount?: number | 'auto' | GlobalCssValues;
  columnWidth?: Length | CalcExpression | 'auto' | string | number | GlobalCssValues;
  columnSpan?: 'none' | 'all' | GlobalCssValues;
  columnFill?: 'auto' | 'balance' | GlobalCssValues;
  columnRule?: string | GlobalCssValues;
  columnRuleColor?: string | GlobalCssValues;
  columnRuleStyle?: string | GlobalCssValues;
  columnRuleWidth?: Length | CalcExpression | string | number | GlobalCssValues;

  // Table Layout
  borderCollapse?: 'collapse' | 'separate' | GlobalCssValues;
  borderSpacing?: Length | CalcExpression | string | number | ReadonlyArray<Length | CalcExpression | string | number> | GlobalCssValues;
  tableLayout?: 'auto' | 'fixed' | GlobalCssValues;
  emptyCells?: 'show' | 'hide' | GlobalCssValues;
  captionSide?: 'top' | 'bottom' | GlobalCssValues;
}
