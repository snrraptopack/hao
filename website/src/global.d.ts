// Global JSX declarations for Auwla classic JSX runtime
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface ElementChildrenAttribute { children: any }
    type Element = HTMLElement;
  }
}

export {}