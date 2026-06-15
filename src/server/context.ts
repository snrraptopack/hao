/**
 * @fileoverview Request-scoped context storage for Auwla server functions.
 *
 * Uses Node's AsyncLocalStorage so that getContext() and getParams() work
 * anywhere inside a running request without explicit propagation.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { ServerContext, Locals } from './types'
import type { ValidRoutePath, PathParams } from 'auwla/router'

// The dev server may load server files through Vite's SSR runner while the
// adapter is loaded through Node's module system. That can create two copies of
// this module and therefore two AsyncLocalStorage instances. Sharing one global
// instance keeps getContext() working regardless of which loader imported it.
const globalStore = (globalThis as Record<string, unknown>).__auwla_asyncStorage as
  | AsyncLocalStorage<ServerContext<any, any, any>>
  | undefined
const asyncStorage = globalStore ?? new AsyncLocalStorage<ServerContext<any, any, any>>()
if (!globalStore) {
  ;(globalThis as Record<string, unknown>).__auwla_asyncStorage = asyncStorage
}

/**
 * Run `fn` with the provided server context. All calls to getContext()
 * inside `fn` (and any async operations started from it) will see this context.
 */
export function runWithContext<T>(
  ctx: ServerContext<any, any, any>,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return asyncStorage.run(ctx, fn)
}

/**
 * Read the current request context.
 *
 * Throws if called outside of runWithContext().
 */
export function getContext<
  Params = Record<string, string | string[]>,
  Platform = Record<string, any>,
  TLocals = Locals,
>(): ServerContext<Params, Platform, TLocals> {
  const ctx = asyncStorage.getStore()
  if (!ctx) {
    throw new Error('[auwla/server] getContext() called outside of request context')
  }
  return ctx as any
}

/**
 * Typed shortcut for getContext().params.
 *
 * Uses the same route-path registry as the client router, so server and client
 * get identical param types. The path argument is only for type inference.
 *
 *   const { id } = getParams('/posts/:id') // { id: string }
 */
export function getParams<P extends ValidRoutePath>(_path?: P): PathParams<P> {
  return getContext().params as PathParams<P>
}
