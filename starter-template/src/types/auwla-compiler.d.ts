// Type definitions for auwla compiler functions

declare global {
    /**
     * Conditional rendering function for auwla compiler
     * @param condition - Boolean condition to evaluate
     * @param element - JSX element to render when condition is true
     */
    function $if(condition: any, element: JSX.Element): JSX.Element | null;

    /**
     * Else-if conditional rendering function for auwla compiler
     * @param condition - Boolean condition to evaluate
     * @param element - JSX element to render when condition is true
     */
    function $elseif(condition: any, element: JSX.Element): JSX.Element | null;

    /**
     * Else rendering function for auwla compiler
     * @param element - JSX element to render
     */
    function $else(element: JSX.Element): JSX.Element;

    /**
     * List rendering function for auwla compiler
     * @param items - Array of items to iterate over
     * @param renderFn - Function that renders each item
     */
    function $each<T>(items: T[], renderFn: (item: T, index: number) => JSX.Element): JSX.Element[];

    /**
     * Key function for auwla compiler
     * @param key - Unique key for the element
     * @param element - JSX element to render
     */
    function $key(key: string | number, element: JSX.Element): JSX.Element;

    /**
     * Map function for auwla compiler
     * @param items - Array of items to iterate over
     * @param renderFn - Function that renders each item
     */
    function $map<T>(items: T[], renderFn: (item: T, index: number) => JSX.Element): JSX.Element[];
}

export { };