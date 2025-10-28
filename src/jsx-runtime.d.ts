// Runtime exports used by automatic JSX
export declare const Fragment: any;
export declare function jsx(type: any, props?: any, key?: any): any;
export declare const jsxs: typeof jsx;

// Global JSX types so consumers get intrinsic elements without React types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;

    }
    // Children property name for JSX elements
    interface ElementChildrenAttribute { children: any }
    // Shape of an element produced by Auwla JSX
    type Element = HTMLElement;
  }
}

export {};