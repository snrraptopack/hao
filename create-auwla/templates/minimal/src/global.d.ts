/**
 * TypeScript declarations for Auwla template file support and helpers.
 * Kept separate from global JSX types to avoid duplication during library build.
 */

// Global JSX declarations so consumers can use JSX without React types
import type { Ref } from 'auwla';

type Reactive<T> = T | Ref<T>;
type DataAttr = `data-${string}`;
type AriaAttr = `aria-${string}`;

type Child = string | number | Node | Reactive<string | number | Node>;
type Children = Child | Child[];

// CSS properties that accept string or number values
type CSSProperties = {
  [K in keyof CSSStyleDeclaration]?: string | number;
};

interface EventProps {
  // Mouse
  onClick?: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  // Keyboard
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onKeyPress?: (e: KeyboardEvent) => void;
  // Focus
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  // Input & Change
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  // Form
  onSubmit?: (e: SubmitEvent) => void;
  // Pointer & Touch
  onPointerDown?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerEnter?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onTouchStart?: (e: TouchEvent) => void;
  onTouchEnd?: (e: TouchEvent) => void;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchCancel?: (e: TouchEvent) => void;
}

type BaseProps<E extends HTMLElement> = EventProps & {
  children?: Children;
  key?: string | number;
  ref?: (el: E) => void;
  class?: Reactive<string>;
  className?: Reactive<string>;
  id?: Reactive<string>;
  title?: Reactive<string>;
  hidden?: Reactive<boolean>;
  style?: Reactive<string | Partial<CSSProperties>>;
  tabIndex?: Reactive<number>;
  draggable?: Reactive<boolean>;
  contentEditable?: Reactive<boolean>;
  role?: Reactive<string>;
} & { [K in DataAttr]?: Reactive<string | number | boolean> } & { [K in AriaAttr]?: Reactive<string | number | boolean> };

interface AnchorProps extends BaseProps<HTMLAnchorElement> {
  href?: Reactive<string>;
  target?: Reactive<string>;
  rel?: Reactive<string>;
}

interface ButtonProps extends BaseProps<HTMLButtonElement> {
  disabled?: Reactive<boolean>;
  type?: Reactive<'button' | 'submit' | 'reset'>;
  name?: Reactive<string>;
  value?: Reactive<string | number>;
}

interface InputProps extends BaseProps<HTMLInputElement> {
  type?: Reactive<string>;
  value?: Reactive<string | number>;
  checked?: Reactive<boolean>;
  placeholder?: Reactive<string>;
  disabled?: Reactive<boolean>;
  name?: Reactive<string>;
  min?: Reactive<number | string>;
  max?: Reactive<number | string>;
  step?: Reactive<number | string>;
}

interface TextareaProps extends BaseProps<HTMLTextAreaElement> {
  value?: Reactive<string>;
  placeholder?: Reactive<string>;
  disabled?: Reactive<boolean>;
  rows?: Reactive<number>;
  cols?: Reactive<number>;
  name?: Reactive<string>;
}

interface SelectProps extends BaseProps<HTMLSelectElement> {
  value?: Reactive<string | number>;
  multiple?: Reactive<boolean>;
  disabled?: Reactive<boolean>;
  name?: Reactive<string>;
}

interface OptionProps extends BaseProps<HTMLOptionElement> {
  value?: string | number;
  selected?: Reactive<boolean>;
  disabled?: Reactive<boolean>;
  label?: Reactive<string>;
}

interface ImgProps extends BaseProps<HTMLImageElement> {
  src?: Reactive<string>;
  alt?: Reactive<string>;
  width?: Reactive<number>;
  height?: Reactive<number>;
}

interface FormProps extends BaseProps<HTMLFormElement> {
  action?: Reactive<string>;
  method?: Reactive<string>;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Common text/content elements
      div: BaseProps<HTMLDivElement>;
      span: BaseProps<HTMLSpanElement>;
      p: BaseProps<HTMLParagraphElement>;
      // Headings & text semantics
      h1: BaseProps<HTMLHeadingElement>;
      h2: BaseProps<HTMLHeadingElement>;
      h3: BaseProps<HTMLHeadingElement>;
      h4: BaseProps<HTMLHeadingElement>;
      h5: BaseProps<HTMLHeadingElement>;
      h6: BaseProps<HTMLHeadingElement>;
      pre: BaseProps<HTMLPreElement>;
      code: BaseProps<HTMLElement>;
      blockquote: BaseProps<HTMLQuoteElement>;
      small: BaseProps<HTMLElement>;
      strong: BaseProps<HTMLElement>;
      em: BaseProps<HTMLElement>;
      i: BaseProps<HTMLElement>;
      b: BaseProps<HTMLElement>;
      u: BaseProps<HTMLElement>;
      s: BaseProps<HTMLElement>;
      sup: BaseProps<HTMLElement>;
      sub: BaseProps<HTMLElement>;
      ul: BaseProps<HTMLUListElement>;
      ol: BaseProps<HTMLOListElement>;
      dl: BaseProps<HTMLDListElement>;
      dt: BaseProps<HTMLElement>;
      dd: BaseProps<HTMLElement>;
      li: BaseProps<HTMLLIElement>;
      section: BaseProps<HTMLElement>;
      article: BaseProps<HTMLElement>;
      aside: BaseProps<HTMLElement>;
      header: BaseProps<HTMLElement>;
      footer: BaseProps<HTMLElement>;
      nav: BaseProps<HTMLElement>;
      main: BaseProps<HTMLElement>;
      figure: BaseProps<HTMLElement>;
      figcaption: BaseProps<HTMLElement>;
      details: BaseProps<HTMLDetailsElement>;
      summary: BaseProps<HTMLElement>;
      dialog: BaseProps<HTMLDialogElement>;
      label: BaseProps<HTMLLabelElement>;

      // Interactive & forms
      a: AnchorProps;
      button: ButtonProps;
      input: InputProps;
      textarea: TextareaProps;
      select: SelectProps;
      option: OptionProps;
      form: FormProps;
      fieldset: BaseProps<HTMLFieldSetElement>;
      legend: BaseProps<HTMLLegendElement>;

      // Media
      img: ImgProps;
      audio: BaseProps<HTMLAudioElement>;
      video: BaseProps<HTMLVideoElement>;
      source: BaseProps<HTMLSourceElement>;
      track: BaseProps<HTMLTrackElement>;
      canvas: BaseProps<HTMLCanvasElement>;
      iframe: BaseProps<HTMLIFrameElement>;

      // Tables
      table: BaseProps<HTMLTableElement>;
      thead: BaseProps<HTMLTableSectionElement>;
      tbody: BaseProps<HTMLTableSectionElement>;
      tfoot: BaseProps<HTMLTableSectionElement>;
      tr: BaseProps<HTMLTableRowElement>;
      th: BaseProps<HTMLTableCellElement>;
      td: BaseProps<HTMLTableCellElement>;
      col: BaseProps<HTMLTableColElement>;
      colgroup: BaseProps<HTMLTableColElement>;

      // Misc
      hr: BaseProps<HTMLHRElement>;
      br: BaseProps<HTMLBRElement>;
      address: BaseProps<HTMLElement>;
      time: BaseProps<HTMLTimeElement>;
      progress: BaseProps<HTMLProgressElement>;
      meter: BaseProps<HTMLMeterElement>;
      template: BaseProps<HTMLTemplateElement>;
    }

    // Children property name for JSX
    interface ElementChildrenAttribute { children: Children }
    // Define Element type for JSX
    type Element = HTMLElement;
  }
}

declare module '*.auwla' {
  const component: HTMLElement;
  export default component;
}

declare module 'auwla/template' {
  import { Ref } from './src/state';

  /**
   * Reactive conditional rendering
   * Compile-time marker transformed by the Auwla compiler
   */
}

export {};