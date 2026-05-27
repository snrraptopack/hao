export declare const Fragment: (props?: { children?: JSX.Children }) => DocumentFragment;
export declare function jsx(type: any, props?: any, key?: any): JSX.Element;
export declare const jsxs: typeof jsx;

type DataAttr = `data-${string}`;
type AriaAttr = `aria-${string}`;
type RenderClosure = () => Child | readonly Child[];
type Child = string | number | boolean | null | undefined | Node | RenderClosure;
type Children = Child | readonly Child[];

type CSSProperties = Partial<{
  [K in keyof CSSStyleDeclaration]: string | number;
}>;

type EventProps = {
  onClick?: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onKeyPress?: (e: KeyboardEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  onSubmit?: (e: SubmitEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerEnter?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onTouchStart?: (e: TouchEvent) => void;
  onTouchEnd?: (e: TouchEvent) => void;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchCancel?: (e: TouchEvent) => void;
};

type CustomEventProps = {
  [K in `on:${string}`]?: (payload: any) => void;
};

type BaseProps<E extends HTMLElement> = EventProps & {
  children?: Children;
  key?: string | number;
  ref?: (el: E) => void;
  class?: string;
  className?: string;
  id?: string;
  title?: string;
  hidden?: boolean;
  style?: string | CSSProperties;
  tabIndex?: number;
  draggable?: boolean;
  contentEditable?: boolean | 'true' | 'false' | 'inherit' | 'plaintext-only';
  role?: string;
} & CustomEventProps & { [K in DataAttr]?: string | number | boolean } & { [K in AriaAttr]?: string | number | boolean };

interface AnchorProps extends BaseProps<HTMLAnchorElement> {
  href?: string;
  target?: string;
  rel?: string;
}

interface ButtonProps extends BaseProps<HTMLButtonElement> {
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string | number;
}

interface InputProps extends BaseProps<HTMLInputElement> {
  type?: string;
  value?: string | number;
  checked?: boolean;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

interface TextareaProps extends BaseProps<HTMLTextAreaElement> {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  cols?: number;
  name?: string;
}

interface SelectProps extends BaseProps<HTMLSelectElement> {
  value?: string | number;
  multiple?: boolean;
  disabled?: boolean;
  name?: string;
}

interface OptionProps extends BaseProps<HTMLOptionElement> {
  value?: string | number;
  selected?: boolean;
  disabled?: boolean;
  label?: string;
}

interface ImgProps extends BaseProps<HTMLImageElement> {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface FormProps extends BaseProps<HTMLFormElement> {
  action?: string;
  method?: 'get' | 'post' | 'dialog';
}

declare global {
  namespace JSX {
    type Children = Child | readonly Child[];
    type Element = Node;
    interface ElementChildrenAttribute { children: Children }
    interface IntrinsicElements {
      div: BaseProps<HTMLDivElement>;
      span: BaseProps<HTMLSpanElement>;
      p: BaseProps<HTMLParagraphElement>;
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
      a: AnchorProps;
      button: ButtonProps;
      input: InputProps;
      textarea: TextareaProps;
      select: SelectProps;
      option: OptionProps;
      form: FormProps;
      fieldset: BaseProps<HTMLFieldSetElement>;
      legend: BaseProps<HTMLLegendElement>;
      img: ImgProps;
      audio: BaseProps<HTMLAudioElement>;
      video: BaseProps<HTMLVideoElement>;
      source: BaseProps<HTMLSourceElement>;
      track: BaseProps<HTMLTrackElement>;
      canvas: BaseProps<HTMLCanvasElement>;
      iframe: BaseProps<HTMLIFrameElement>;
      table: BaseProps<HTMLTableElement>;
      thead: BaseProps<HTMLTableSectionElement>;
      tbody: BaseProps<HTMLTableSectionElement>;
      tfoot: BaseProps<HTMLTableSectionElement>;
      tr: BaseProps<HTMLTableRowElement>;
      th: BaseProps<HTMLTableCellElement>;
      td: BaseProps<HTMLTableCellElement>;
      col: BaseProps<HTMLTableColElement>;
      colgroup: BaseProps<HTMLTableColElement>;
      hr: BaseProps<HTMLHRElement>;
      br: BaseProps<HTMLBRElement>;
      address: BaseProps<HTMLElement>;
      time: BaseProps<HTMLTimeElement>;
      progress: BaseProps<HTMLProgressElement>;
      meter: BaseProps<HTMLMeterElement>;
      template: BaseProps<HTMLTemplateElement>;
    }
  }
}

export {};
