/**
 * TypeScript declaration for .auwla template files
 * Allows importing .auwla files as components
 */
declare module '*.auwla' {
  const component: HTMLElement;
  export default component;
}

/**
 * Template helper functions for .auwla files
 * These are compile-time markers that transform to ui.When() and ui.List()
 */
declare module 'auwla/template' {
  import { Ref } from './state';

  /**
   * Reactive conditional rendering
   * Compiles to ui.When() in template context
   * 
   * @param condition - Ref<boolean> or boolean expression
   * @param thenFn - Callback function that renders when condition is true
   */
  export function $if(
    condition: Ref<boolean> | boolean,
    thenFn: () => void
  ): void;

  /**
   * Reactive list rendering
   * Compiles to ui.List() in template context
   * 
   * @param items - Ref to array of items
   * @param render - Callback function for rendering each item
   */
  export function each<T>(
    items: Ref<T[]>,
    render: (item: T, index: number) => void
  ): void;
}
