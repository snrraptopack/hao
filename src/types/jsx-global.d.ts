/**
 * Global JSX type declarations for Auwla.
 * Ensures consumers can write JSX without React types.
 */
declare global {
  namespace JSX {
    /**
     * Allow any HTML element with any props. This keeps typing permissive
     * while the library handles runtime mapping of attributes and events.
     */
    interface IntrinsicElements {
      [elemName: string]: any;
    }

    /** JSX element produced by Auwla's `h` factory */
    type Element = HTMLElement;
  }
}

export {}