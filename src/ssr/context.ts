/**
 * @fileoverview SSR request context.
 *
 * Holds the per-request state used by the renderer to resolve server
 * functions locally and to flush async work before the response is sent.
 */

import type { ServerManifest } from '../server/types';
import { createSsrRpcInvoker, type SsrRpcInvoker } from './rpc';

export interface SsrContextOptions {
  request?: Request;
  manifest?: ServerManifest;
  /**
   * Custom module loader used to resolve server functions from the manifest.
   * Defaults to importing the module path directly.
   */
  load?: (path: string) => Promise<Record<string, unknown>>;
}

export interface SsrContext {
  request: Request;
  manifest: ServerManifest | undefined;
  invoker: SsrRpcInvoker;
  pending: Set<Promise<unknown>>;
  track<T>(promise: Promise<T>): Promise<T>;
}

/**
 * Create a fresh SSR context for a single request.
 */
export function createSsrContext(options: SsrContextOptions = {}): SsrContext {
  const request = options.request ?? new Request('http://localhost/');
  const pending = new Set<Promise<unknown>>();

  const context: SsrContext = {
    request,
    manifest: options.manifest,
    invoker: createSsrRpcInvoker(options.manifest ?? {}, request, options.load),
    pending,
    track<T>(promise: Promise<T>): Promise<T> {
      pending.add(promise);
      promise.then(
        () => pending.delete(promise),
        () => pending.delete(promise),
      );
      return promise;
    },
  };

  return context;
}
