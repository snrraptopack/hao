/**
 * @fileoverview SSR hydration support for track.
 *
 * Seeds the client registry from the SSR payload (`window.__AUWLA_DATA__`),
 * warms lazy route chunks, and reports in-flight loaders so the app can keep
 * the server-rendered DOM alive until everything is ready.
 */

import { reactive } from '../runtime/reactive';
import { getRegistry, getOrCreate } from './registry';
import type { TrackStatus } from './registry';

/** @internal Extract the resolved state of all queries and loaders for SSR hydration.
 *
 * Scans ALL registry entries (regardless of namespace prefix) for resolved remote:
 * and __loader: keys. On the server each routed query is stored under the request
 * route path as the namespace (e.g. `/posts/42::remote:posts.getPost:42`), so we
 * cannot restrict to `__global::` only — we strip the namespace prefix and emit
 * the bare key (`remote:posts.getPost:42`) for the client hydration script.
 */
export function __extractTrackState(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, state] of getRegistry().entries()) {
    if (state.statusCell.get() !== 'resolved') continue;
    const separatorIdx = key.indexOf('::');
    if (separatorIdx === -1) continue;
    const name = key.slice(separatorIdx + 2); // strip `<namespace>::`
    if (name.startsWith('remote:') || name.startsWith('__loader:')) {
      data[name] = state.value;
    }
  }
  return data;
}

/**
 * Number of lazy page chunks currently being warmed during SSG hydration.
 *
 * Incremented when `hydrateTrackState` kicks off a chunk load for a pre-seeded
 * loader; decremented when that load settles. `hasPendingLoaders()` includes
 * this count so `skipFirstHydrationPatch` keeps the SSR DOM alive until the
 * component module is ready.
 */
let _pendingChunkCount = 0;

/**
 * Test whether a concrete URL path (e.g. `/docs/introduction`) matches a
 * route pattern (e.g. `__loader:/docs/:slug`). Segments that start with `:` are
 * treated as wildcards.
 */
function matchesLoaderPattern(loaderKey: string, pattern: string): boolean {
  const pathParts    = loaderKey.split('/');
  const patternParts = pattern.split('/');
  if (pathParts.length !== patternParts.length) return false;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i]!.startsWith(':')) continue; // wildcard segment
    if (patternParts[i] !== pathParts[i]) return false;
  }
  return true;
}

/**
 * Seed the track registry from the SSR data payload embedded in the page.
 *
 * Call this once at client startup (before mounting the app) to pre-populate
 * `track.get` handles as already-resolved so components skip the network fetch
 * and render immediately from cache.
 *
 * When a lazy-route chunk warmer is registered on `globalThis.__auwla_chunkWarmers`
 * (keyed by `__loader:${routePattern}`), this function also kicks off that chunk
 * load and increments `_pendingChunkCount` so that `hasPendingLoaders()` returns
 * `true` until the chunk settles — preventing the SSR DOM from being wiped before
 * the component module is available.
 *
 * @param data - The object from `window.__AUWLA_DATA__` injected by `renderToString`.
 */
export function hydrateTrackState(data: Record<string, unknown>): void {
  const warmers: Record<string, () => Promise<unknown>> =
    (typeof globalThis !== 'undefined' && (globalThis as any).__auwla_chunkWarmers) ?? {};

  for (const [name, value] of Object.entries(data)) {
    // Keys arrive as "remote:posts.getPost" or "__loader:/docs/introduction".
    // Restore the full registry key used internally.
    const key = `__global::${name}`;
    const state = getOrCreate(key);
    // Mark as resolved with the server value; promise resolves immediately.
    state.statusCell = reactive<TrackStatus>('resolved');
    state.value = value;
    state.promise = Promise.resolve(value);

    // For loader keys, find and fire the matching lazy chunk warmer so that
    // __mods is populated before the Router renders the route component.
    if (name.startsWith('__loader:')) {
      // Try exact match first (e.g. non-dynamic route), then pattern match.
      let warmer = warmers[name];
      if (!warmer) {
        for (const [pattern, fn] of Object.entries(warmers)) {
          if (matchesLoaderPattern(name, pattern)) {
            warmer = fn;
            break;
          }
        }
      }
      if (typeof warmer === 'function') {
        _pendingChunkCount++;
        const promise = warmer();
        promise.then(
          () => {
            _pendingChunkCount--;
            // Notify the app to re-render now that the chunk is ready.
            (globalThis as any).__auwla_invalidate?.();
          },
          () => {
            // Chunk failed to load — decrement so the app doesn't hang.
            _pendingChunkCount--;
            (globalThis as any).__auwla_invalidate?.();
          },
        );
      }
    }
  }
}

/** @internal Check if any route loader or lazy chunk is currently pending. */
export function hasPendingLoaders(): boolean {
  // A lazy chunk is still being loaded for an SSG-hydrated page.
  if (_pendingChunkCount > 0) return true;
  for (const [key, state] of getRegistry().entries()) {
    if (key.includes('__loader:') && state.statusCell.get() === 'pending') {
      return true;
    }
  }
  return false;
}
