/**
 * TypeScript declarations for Auwla template file support and helpers.
 * Kept separate from global JSX types to avoid duplication during library build.
 */

// Global JSX declarations so consumers can use JSX without React types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Allow any HTML elements with any props
      [elemName: string]: any;
    }
    
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
  export function $if(
    condition: Ref<boolean> | boolean,
    thenFn?: () => void
  ): boolean;

  /** Else-if conditional rendering */
  export function $elseif(
    condition: Ref<boolean> | boolean,
    content?: any
  ): boolean;

  /** Else conditional rendering */
  export function $else(content?: any): void;

  /** Simple conditional rendering (new syntax) */
  export function $when(
    condition: Ref<boolean> | boolean,
    content: any
  ): void;

  /** Reactive list rendering */
  export function each<T>(
    items: Ref<T[]>,
    render: (item: T, index: number) => void
  ): void;
}

export {};