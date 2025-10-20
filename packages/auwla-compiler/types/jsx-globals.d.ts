declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Allow any HTML elements
      [elemName: string]: any;
    }
  }

  // Custom Auwla JSX syntax functions
  
  /**
   * Conditional rendering function
   * Usage: {$if(condition, <element/>)}
   * Usage: {$if(condition) && (<element/>)}
   */
  function $if(condition: any): boolean;
  function $if(condition: any, element: JSX.Element): JSX.Element | null;
  
  /**
   * Else-if conditional rendering
   * Usage: {$elseif(condition, <element/>)}
   */
  function $elseif(condition: any, element: JSX.Element): JSX.Element | null;
  
  /**
   * Else conditional rendering
   * Usage: {$else(<element/>)}
   */
  function $else(element: JSX.Element): JSX.Element;
  
  /**
   * Each/loop rendering function
   * Usage: {$each(items, (item, index) => <element/>)}
   */
  function $each<T>(
    items: T[] | readonly T[],
    render: (item: T, index: number) => JSX.Element
  ): JSX.Element[];
  
  /**
   * Key function for list items
   * Usage: {$key(item.id, <element/>)}
   */
  function $key(key: string | number, element: JSX.Element): JSX.Element;
  
  /**
   * Map function for reactive arrays
   * Usage: {$map(items, (item) => <element/>)}
   */
  function $map<T>(
    items: T[] | readonly T[],
    render: (item: T, index: number) => JSX.Element
  ): JSX.Element[];
}

export {};