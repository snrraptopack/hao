/**
 * @fileoverview Comprehensive JSX type definitions for Auwla.
 *
 * This module is the single source of truth for JSX types. It defines
 * the JSX namespace, intrinsic element types, event handlers, and
 * framework-specific props.
 *
 * The intrinsic element list is generated automatically from TypeScript's
 * DOM lib (`HTMLElementTagNameMap` and `SVGElementTagNameMap`) so every
 * standard HTML and SVG element is supported without manual maintenance.
 */

import type { StyleObject } from '../css/types';
import type { MemoChild, RenderClosure } from '../runtime/types';

export type Child = MemoChild;
export type Children = Child | readonly Child[];

export type CSSProperties = Partial<{
  [K in keyof CSSStyleDeclaration]: string | number;
}>;

export type DataAttr = `data-${string}`;
export type AriaAttr = `aria-${string}`;

/* ------------------------------------------------------------------ */
// Event handlers
/* ------------------------------------------------------------------ */

export type EventProps = {
  // Mouse events
  onClick?: (e: MouseEvent) => void;
  onContextMenu?: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseOut?: (e: MouseEvent) => void;
  onMouseOver?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onWheel?: (e: WheelEvent) => void;

  // Keyboard events
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyPress?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;

  // Focus events
  onBlur?: (e: FocusEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onFocusIn?: (e: FocusEvent) => void;
  onFocusOut?: (e: FocusEvent) => void;

  // Form events
  onBeforeInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  onInput?: (e: InputEvent) => void;
  onInvalid?: (e: Event) => void;
  onReset?: (e: Event) => void;
  onSubmit?: (e: SubmitEvent) => void;

  // Pointer events
  onPointerCancel?: (e: PointerEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerEnter?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerOut?: (e: PointerEvent) => void;
  onPointerOver?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;

  // Touch events
  onTouchCancel?: (e: TouchEvent) => void;
  onTouchEnd?: (e: TouchEvent) => void;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchStart?: (e: TouchEvent) => void;

  // Drag events
  onDrag?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  onDragEnter?: (e: DragEvent) => void;
  onDragExit?: (e: DragEvent) => void;
  onDragLeave?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDragStart?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;

  // Clipboard events
  onCopy?: (e: ClipboardEvent) => void;
  onCut?: (e: ClipboardEvent) => void;
  onPaste?: (e: ClipboardEvent) => void;

  // Composition events
  onCompositionEnd?: (e: CompositionEvent) => void;
  onCompositionStart?: (e: CompositionEvent) => void;
  onCompositionUpdate?: (e: CompositionEvent) => void;

  // Media events
  onAbort?: (e: Event) => void;
  onCanPlay?: (e: Event) => void;
  onCanPlayThrough?: (e: Event) => void;
  onDurationChange?: (e: Event) => void;
  onEmptied?: (e: Event) => void;
  onEnded?: (e: Event) => void;
  onLoadedData?: (e: Event) => void;
  onLoadedMetadata?: (e: Event) => void;
  onLoadStart?: (e: Event) => void;
  onPause?: (e: Event) => void;
  onPlay?: (e: Event) => void;
  onPlaying?: (e: Event) => void;
  onProgress?: (e: Event) => void;
  onRateChange?: (e: Event) => void;
  onSeeked?: (e: Event) => void;
  onSeeking?: (e: Event) => void;
  onStalled?: (e: Event) => void;
  onSuspend?: (e: Event) => void;
  onTimeUpdate?: (e: Event) => void;
  onVolumeChange?: (e: Event) => void;
  onWaiting?: (e: Event) => void;

  // Animation / transition events
  onAnimationEnd?: (e: AnimationEvent) => void;
  onAnimationIteration?: (e: AnimationEvent) => void;
  onAnimationStart?: (e: AnimationEvent) => void;
  onTransitionCancel?: (e: TransitionEvent) => void;
  onTransitionEnd?: (e: TransitionEvent) => void;
  onTransitionRun?: (e: TransitionEvent) => void;
  onTransitionStart?: (e: TransitionEvent) => void;

  // General events
  onError?: (e: Event) => void;
  onLoad?: (e: Event) => void;
  onResize?: (e: Event) => void;
  onScroll?: (e: Event) => void;
  onSelect?: (e: Event) => void;
  onToggle?: (e: Event) => void;

  // Framework-specific events
  onIntersect?: (e: CustomEvent<IntersectionObserverEntry>) => void;
  onTouch?: (e: CustomEvent<any>) => void;
};

export type CustomEventProps = {
  [K in `emit:${string}`]?: (payload: any) => void;
};

/* ------------------------------------------------------------------ */
// Base props applied to every intrinsic element
/* ------------------------------------------------------------------ */

export type BaseProps<E extends Element> = EventProps & {
  children?: Children;
  key?: string | number;
  ref?: (el: E) => void;
  bind?: any;
  class?: string | StyleObject | Function;
  className?: string | StyleObject | Function;
  id?: string;
  title?: string;
  hidden?: boolean;
  style?: string | CSSProperties | StyleObject | Function;
  tabIndex?: number;
  draggable?: boolean;
  contentEditable?: boolean | 'true' | 'false' | 'inherit' | 'plaintext-only';
  role?: string;

  // Global HTML attributes
  accessKey?: string;
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  autocorrect?: 'on' | 'off';
  autofocus?: boolean;
  dir?: 'ltr' | 'rtl' | 'auto';
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
  inert?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  itemProp?: string;
  itemScope?: boolean;
  itemType?: string;
  itemID?: string;
  itemRef?: string;
  lang?: string;
  nonce?: string;
  popover?: 'auto' | 'manual' | string;
  slot?: string;
  spellcheck?: boolean | 'true' | 'false';
  translate?: 'yes' | 'no';

  // Common attributes shared across many elements
  about?: string;
  datatype?: string;
  typeof?: string;
  property?: string;
  resource?: string;
  prefix?: string;

  // Form / input common
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string | number | readonly string[];
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  multiple?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  checked?: boolean;
  selected?: boolean;
  defaultValue?: string | number | readonly string[];
  defaultChecked?: boolean;

  // Numeric / range
  max?: number | string;
  min?: number | string;
  step?: number | string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  size?: number;
  rows?: number;
  cols?: number;
  wrap?: string;

  // Link / media
  href?: string;
  hrefLang?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
  ping?: string;
  src?: string;
  srcSet?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'eager' | 'lazy';
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  referrerPolicy?: string;
  decoding?: 'sync' | 'async' | 'auto';
  integrity?: string;
  media?: string;
  sizes?: string;
  as?: string;

  // Form
  action?: string;
  accept?: string;
  acceptCharset?: string;
  encType?: string;
  method?: string;
  noValidate?: boolean;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;

  // Misc common
  abbr?: string;
  align?: string;
  cite?: string;
  dateTime?: string;
  label?: string;
  list?: string;
  open?: boolean;
  scope?: string;
  span?: number;
  useMap?: string;
  start?: number;
  reversed?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  playsInline?: boolean;
  poster?: string;
  kind?: string;
  default?: boolean;
  optimum?: number;
  low?: number;
  high?: number;
  challenge?: string;
  keytype?: string;
  keyparams?: string;
} & CustomEventProps &
  { [K in DataAttr]?: string | number | boolean } &
  { [K in AriaAttr]?: string | number | boolean };

/* ------------------------------------------------------------------ */
// Auto-generated intrinsic elements from TypeScript's DOM lib
/* ------------------------------------------------------------------ */

/**
 * SVG geometry / presentation attributes that are not exposed as primitive
 * properties on TypeScript's SVG DOM interfaces. Adding them to the base
 * prop bag lets every SVG element accept them without manually listing tags.
 */
type SVGProps = {
  accumulate?: string;
  additive?: string;
  alignmentBaseline?: string;
  amplitude?: number | string;
  attributeName?: string;
  azimuth?: number | string;
  baseFrequency?: number | string;
  baselineShift?: number | string;
  begin?: string;
  bias?: number | string;
  by?: number | string;
  calcMode?: string;
  clipPath?: string;
  clipPathUnits?: string;
  clipRule?: string;
  color?: string;
  colorInterpolation?: string;
  colorInterpolationFilters?: string;
  colorProfile?: string;
  colorRendering?: string;
  cursor?: string;
  cx?: number | string;
  cy?: number | string;
  d?: string;
  decelerate?: number | string;
  descent?: number | string;
  diffuseConstant?: number | string;
  direction?: string;
  display?: string;
  divisor?: number | string;
  dominantBaseline?: string;
  dur?: string;
  dx?: number | string;
  dy?: number | string;
  edgeMode?: string;
  elevation?: number | string;
  end?: string;
  exponent?: number | string;
  fill?: string;
  fillOpacity?: number | string;
  fillRule?: string;
  filter?: string;
  filterUnits?: string;
  floodColor?: string;
  floodOpacity?: number | string;
  fontFamily?: string;
  fontSize?: number | string;
  fontSizeAdjust?: number | string;
  fontStretch?: string;
  fontStyle?: string;
  fontVariant?: string;
  fontWeight?: number | string;
  fr?: number | string;
  from?: number | string;
  fx?: number | string;
  fy?: number | string;
  gradientTransform?: string;
  gradientUnits?: string;
  hanging?: number | string;
  height?: number | string;
  ideographic?: number | string;
  imageRendering?: string;
  in?: string;
  in2?: string;
  intercept?: number | string;
  k1?: number | string;
  k2?: number | string;
  k3?: number | string;
  k4?: number | string;
  kernelMatrix?: string;
  kernelUnitLength?: number | string;
  keyPoints?: string;
  keySplines?: string;
  keyTimes?: string;
  lengthAdjust?: string;
  letterSpacing?: number | string;
  lightingColor?: string;
  limitingConeAngle?: number | string;
  markerEnd?: string;
  markerHeight?: number | string;
  markerMid?: string;
  markerStart?: string;
  markerUnits?: string;
  markerWidth?: number | string;
  mask?: string;
  maskContentUnits?: string;
  maskUnits?: string;
  mathematical?: number | string;
  max?: number | string;
  mode?: string;
  numOctaves?: number | string;
  offset?: number | string;
  opacity?: number | string;
  operator?: string;
  order?: number | string;
  orient?: number | string;
  origin?: string;
  overflow?: string;
  overlinePosition?: number | string;
  overlineThickness?: number | string;
  paintOrder?: string;
  panose1?: string;
  path?: string;
  pathLength?: number | string;
  patternContentUnits?: string;
  patternTransform?: string;
  patternUnits?: string;
  pointerEvents?: string;
  points?: string;
  pointsAtX?: number | string;
  pointsAtY?: number | string;
  pointsAtZ?: number | string;
  preserveAlpha?: 'true' | 'false';
  preserveAspectRatio?: string;
  primitiveUnits?: string;
  r?: number | string;
  radius?: number | string;
  referrerPolicy?: string;
  refX?: number | string;
  refY?: number | string;
  renderingIntent?: string;
  repeatCount?: string;
  repeatDur?: string;
  requiredExtensions?: string;
  requiredFeatures?: string;
  restart?: string;
  result?: string;
  rotate?: number | string;
  rx?: number | string;
  ry?: number | string;
  scale?: number | string;
  seed?: number | string;
  shapeRendering?: string;
  slope?: number | string;
  spacing?: number | string;
  specularConstant?: number | string;
  specularExponent?: number | string;
  speed?: number | string;
  spreadMethod?: string;
  startOffset?: number | string;
  stdDeviation?: number | string;
  stemh?: number | string;
  stemv?: number | string;
  stitchTiles?: string;
  stopColor?: string;
  stopOpacity?: number | string;
  strikethroughPosition?: number | string;
  strikethroughThickness?: number | string;
  string?: number | string;
  stroke?: string;
  strokeDasharray?: string;
  strokeDashoffset?: number | string;
  strokeLinecap?: string;
  strokeLinejoin?: string;
  strokeMiterlimit?: number | string;
  strokeOpacity?: number | string;
  strokeWidth?: number | string;
  style?: string | CSSProperties | StyleObject | Function;
  surfaceScale?: number | string;
  systemLanguage?: string;
  tableValues?: string;
  target?: string;
  targetX?: number | string;
  targetY?: number | string;
  textAnchor?: string;
  textDecoration?: string;
  textLength?: number | string;
  textRendering?: string;
  to?: number | string;
  transform?: string;
  transformOrigin?: string;
  type?: string;
  u1?: number | string;
  u2?: number | string;
  underlinePosition?: number | string;
  underlineThickness?: number | string;
  unicode?: string;
  unicodeBidi?: string;
  unicodeRange?: string;
  unitsPerEm?: number | string;
  vAlphabetic?: number | string;
  vHanging?: number | string;
  vIdeographic?: number | string;
  vMathematical?: number | string;
  values?: string;
  vectorEffect?: string;
  version?: string;
  vertAdvY?: number | string;
  vertOriginX?: number | string;
  vertOriginY?: number | string;
  viewBox?: string;
  viewTarget?: string;
  visibility?: string;
  widths?: string;
  wordSpacing?: number | string;
  writingMode?: string;
  x?: number | string;
  x1?: number | string;
  x2?: number | string;
  xChannelSelector?: string;
  xHeight?: number | string;
  xlinkActuate?: string;
  xlinkArcrole?: string;
  xlinkHref?: string;
  xlinkRole?: string;
  xlinkShow?: string;
  xlinkTitle?: string;
  xlinkType?: string;
  xmlBase?: string;
  xmlLang?: string;
  xmlSpace?: string;
  xmlns?: string;
  y?: number | string;
  y1?: number | string;
  y2?: number | string;
  yChannelSelector?: string;
  z?: number | string;
  zoomAndPan?: string;
};

/**
 * Picks attribute-like properties from a DOM element interface so each
 * intrinsic element gets its element-specific attributes (e.g. `href` on
 * `<a>`, `type` on `<input>`) without manually listing every tag.
 *
 * Properties already declared in `BaseProps` or `SVGProps` are omitted so
 * framework-specific widened types (e.g. `value?: string | number`) are not
 * narrowed by the DOM interface.
 */
type ElementProps<E extends Element> = Omit<{
  [K in keyof E as K extends keyof Element | 'innerHTML' | 'outerHTML' | 'textContent'
    | 'offsetHeight' | 'offsetWidth' | 'offsetTop' | 'offsetLeft' | 'offsetParent'
    | 'clientHeight' | 'clientWidth' | 'clientTop' | 'clientLeft'
    | 'scrollHeight' | 'scrollWidth' | 'scrollTop' | 'scrollLeft'
    ? never
    : E[K] extends string | number | boolean | null | undefined ? K : never]?: E[K];
}, keyof BaseProps<Element> | keyof SVGProps>;

type HTMLIntrinsicElements = {
  [K in keyof HTMLElementTagNameMap]: BaseProps<HTMLElementTagNameMap[K]> & ElementProps<HTMLElementTagNameMap[K]>;
};

type SVGIntrinsicElements = {
  [K in keyof SVGElementTagNameMap as K extends keyof HTMLElementTagNameMap ? never : K]: BaseProps<SVGElementTagNameMap[K]> & SVGProps & ElementProps<SVGElementTagNameMap[K]>;
};

/* ------------------------------------------------------------------ */
// JSX namespace (module + global)
/* ------------------------------------------------------------------ */

export namespace JSX {
  export type Element = MemoChild | RenderClosure;
  export type Children = Child | readonly Child[];
  export interface ElementChildrenAttribute { children: Children }
  export interface IntrinsicAttributes { key?: string | number | null; }
  export interface IntrinsicElements extends HTMLIntrinsicElements, SVGIntrinsicElements {}
}

declare global {
  namespace JSX {
    type Element = MemoChild | RenderClosure;
    type Children = Child | readonly Child[];
    interface ElementChildrenAttribute { children: Children }
    interface IntrinsicAttributes { key?: string | number | null; }
    interface IntrinsicElements extends HTMLIntrinsicElements, SVGIntrinsicElements {}
  }
}

