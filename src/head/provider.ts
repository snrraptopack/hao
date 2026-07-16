/**
 * @fileoverview SSR head tag collection provider.
 *
 * Uses AsyncLocalStorage to collect <Head> children per SSR request so that
 * concurrent requests never bleed tags into each other.
 *
 * This file is server-only. The client-side Head component accesses it
 * indirectly via `globalThis.__auwla_headProvider` — never by importing this
 * module directly.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

type HeadStore = {
  tags: string[];
};

const headStorage = new AsyncLocalStorage<HeadStore>();

/**
 * Runs `fn` inside a fresh per-request head tag collection scope.
 * Wrap your `renderToString` call with this so that every SSR render gets
 * its own isolated list of tags.
 *
 * @internal — called by `src/runtime/ssr.ts`
 */
export function runWithHeadStore<T>(fn: () => T): T {
  (globalThis as any).__auwla_headProvider = { addHeadTag };
  return headStorage.run({ tags: [] }, fn);
}

/**
 * Adds a raw HTML string to the current request's head tag collection.
 * Called by the Head component during SSR rendering.
 *
 * @internal
 */
export function addHeadTag(html: string): void {
  const store = headStorage.getStore();
  if (store) store.tags.push(html);
}

/**
 * Returns all head tags collected so far in the current SSR request scope.
 * Call this after the render completes to retrieve the full list.
 *
 * @internal — called by `src/runtime/ssr.ts`
 */
export function getCollectedHeadTags(): string[] {
  return headStorage.getStore()?.tags ?? [];
}

// Expose via globalThis so Head.tsx can call addHeadTag without importing
// server-only code (AsyncLocalStorage) into the client bundle.
// This block runs once when this module is first imported on the server.
if (typeof document === 'undefined' || !document.head) {
  (globalThis as any).__auwla_headProvider = { addHeadTag };
}
