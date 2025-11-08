// Augment the Auwla meta context to include an optional AbortSignal
// so page loaders can cancel in-flight requests when params/query change.
declare global {
  interface AuwlaMetaContext {
    /** Abort signal for the current page load (if any) */
    signal?: AbortSignal
  }
}

export {}