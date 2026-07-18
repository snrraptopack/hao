/**
 * @fileoverview Track core public surface.
 *
 * Implementation lives in focused modules — `registry.ts` (store +
 * transitions), `handle.ts` (handle factory + `track()`), `hydration.ts`
 * (SSR seeding), `query.ts` (global query API). This barrel keeps every
 * existing `from './core'` / `from 'auwla/track/core'` import working.
 */

export * from './registry';
export { createHandle, trackImpl } from './handle';
export { trackImpl as track } from './handle';
export { __extractTrackState, hydrateTrackState, hasPendingLoaders } from './hydration';
export { pending, resolved, rejected, value, reason, cancel } from './query';

import { cleanupComponentTracks } from './registry';
import { hasPendingLoaders, hydrateTrackState } from './hydration';

// Publish the runtime-integration hooks consumed by runtime/app.ts via
// getTrackGlobals() — a deliberate decoupling so the runtime does not
// statically depend on track.
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__auwla_hasPendingLoaders = hasPendingLoaders;
  (globalThis as any).__auwla_hydrateTrackState = hydrateTrackState;
  (globalThis as any).__auwla_cleanupComponentTracks = cleanupComponentTracks;
}
