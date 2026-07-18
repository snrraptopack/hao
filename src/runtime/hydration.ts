/**
 * @fileoverview SSR/islands bootstrap glue for app startup.
 *
 * Everything `createMemoApp` does before its first render that relates to
 * server-rendered content: consuming the `__AUWLA_DATA__` payload, kicking
 * off island hydration, and detecting hydration mode. The render loop's own
 * hydration-cursor handling stays in `runtime/app.ts`.
 */

/**
 * Read the track integration hooks published by `track/core.ts`. Deliberate
 * indirection: the runtime does not statically depend on track.
 */
export const getTrackGlobals = (): {
  hasPendingLoaders?: () => boolean;
  hydrateTrackState?: (data: Record<string, unknown>) => void;
  cleanupComponentTracks?: (id: string) => void;
} => {
  const g = globalThis as any;
  return {
    hasPendingLoaders: g.__auwla_hasPendingLoaders,
    hydrateTrackState: g.__auwla_hydrateTrackState,
    cleanupComponentTracks: g.__auwla_cleanupComponentTracks,
  };
};

/** Consume the SSR data payload embedded in the page, if present. */
export function hydrateTrackData(): void {
  if (typeof window !== 'undefined' && (window as any).__AUWLA_DATA__) {
    getTrackGlobals().hydrateTrackState?.((window as any).__AUWLA_DATA__);
    delete (window as any).__AUWLA_DATA__;
  }
}

/** Lazily hydrate any `[data-auwla-island]` roots inside an SSR shell. */
export function bootstrapIslands(root: Element): void {
  if (
    typeof document !== 'undefined' &&
    root.hasAttribute('data-auwla-ssr') &&
    root.querySelector('[data-auwla-island]')
  ) {
    import('./islands').then(({ hydrateIslands }) => hydrateIslands());
  }
}

/**
 * Detect server-rendered content: if the root has child nodes and carries
 * the SSR marker attribute (set by the server adapter), the app hydrates
 * instead of wiping the DOM.
 */
export function shouldHydrate(root: Element): boolean {
  return root.hasAttribute('data-auwla-ssr') && root.hasChildNodes();
}

/**
 * Expose an app's invalidate so lazy-chunk warmers (triggered by
 * hydrateTrackState when __AUWLA_DATA__ is present) can wake the render loop
 * once the component module is loaded into __mods.
 */
export function exposeInvalidateForChunkWarmers(invalidate: () => void): void {
  (globalThis as any).__auwla_invalidate = invalidate;
}

/** Release the hook installed by {@link exposeInvalidateForChunkWarmers}. */
export function clearExposedInvalidate(invalidate: () => void): void {
  if ((globalThis as any).__auwla_invalidate === invalidate) {
    delete (globalThis as any).__auwla_invalidate;
  }
}
