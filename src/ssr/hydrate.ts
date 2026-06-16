/**
 * @fileoverview Basic client-side hydration entry point.
 *
 * Mounts an Auwla app into a root element that already contains
 * server-rendered HTML. The runtime reconciles the existing DOM against
 * the initial render output, attaching event listeners and reusing matching
 * nodes where possible.
 *
 * Full state transfer from server to client (avoiding duplicate data fetches)
 * is not yet implemented — it will be added once the SSR layer stabilizes.
 */

import { createMemoApp } from '../runtime/app';
import type { MemoChild, RenderClosure } from '../runtime/types';

export interface HydrateOptions {
  root: Element;
  app: MemoChild | RenderClosure;
}

/**
 * Hydrate a server-rendered root element with an Auwla app.
 *
 * Returns the mounted app controller (same shape as `createMemoApp`).
 */
export function hydrate(options: HydrateOptions) {
  return createMemoApp(options.root, options.app);
}
