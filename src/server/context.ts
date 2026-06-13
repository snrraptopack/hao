/**
 * @fileoverview Request-scoped context storage for Auwla server functions.
 *
 * Uses Node's AsyncLocalStorage so that getContext() and getParams() work
 * anywhere inside a running request without explicit propagation.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { ServerContext } from './types'

const asyncStorage = new AsyncLocalStorage<ServerContext>()

/**
 * Run `fn` with the provided server context. All calls to getContext()
 * inside `fn` (and any async operations started from it) will see this context.
 */
export function runWithContext<T>(
  ctx: ServerContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return asyncStorage.run(ctx, fn)
}

/**
 * Read the current request context.
 *
 * Throws if called outside of runWithContext().
 */
export function getContext(): ServerContext {
  const ctx = asyncStorage.getStore()
  if (!ctx) {
    throw new Error('[auwla/server] getContext() called outside of request context')
  }
  return ctx
}

/**
 * Typed shortcut for getContext().params.
 *
 * Params type is inferred from the .server.ts file location by the Vite plugin.
 */
export function getParams<T = Record<string, string>>(): T {
  return getContext().params as T
}
