/**
 * Global TypeScript declarations for Auwla custom JSX syntax
 * Include this file in your tsconfig.json "types" array or "include" array
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Allow any HTML elements with any props
      [elemName: string]: any;
    }
    
    // Define Element type for JSX
    type Element = HTMLElement;
  }

  /**
   * Auwla Custom JSX Functions
   * These functions are transformed by the Auwla compiler into reactive UI builder calls
   */

  /**
   * Conditional rendering function
   * @param condition - Boolean condition or reactive expression
   * @param element - JSX element to render when condition is true
   * 
   * Usage patterns:
   * - {$if(condition, <div>Content</div>)}
   * - {$if(condition) && (<div>Content</div>)}
   */
  function $if(condition: any): boolean;
  function $if(condition: any, element: JSX.Element): JSX.Element | null;
  
  /**
   * Else-if conditional rendering
   * @param condition - Boolean condition or reactive expression
   * @param element - JSX element to render when condition is true
   * 
   * Usage: {$elseif(condition, <div>Content</div>)}
   */
  function $elseif(condition: any, element: JSX.Element): JSX.Element | null;
  
  /**
   * Else conditional rendering
   * @param element - JSX element to render as fallback
   * 
   * Usage: {$else(<div>Default content</div>)}
   */
  function $else(element: JSX.Element): JSX.Element;
  
  /**
   * Each/loop rendering function for arrays
   * @param items - Array of items to iterate over
   * @param render - Function that renders each item
   * 
   * Usage: {$each(items, (item, index) => <div key={item.id}>{item.name}</div>)}
   */
  function $each<T>(
    items: T[] | readonly T[],
    render: (item: T, index: number) => JSX.Element
  ): JSX.Element[];
  
  /**
   * Key function for list items (helps with reconciliation)
   * @param key - Unique key for the element
   * @param element - JSX element to associate with the key
   * 
   * Usage: {$key(item.id, <div>{item.name}</div>)}
   */
  function $key(key: string | number, element: JSX.Element): JSX.Element;
  
  /**
   * Map function for reactive arrays
   * @param items - Array of items to map over
   * @param render - Function that renders each item
   * 
   * Usage: {$map(items, (item, index) => <div>{item.name}</div>)}
   */
  function $map<T>(
    items: T[] | readonly T[],
    render: (item: T, index: number) => JSX.Element
  ): JSX.Element[];
}

export {};