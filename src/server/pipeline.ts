/**
 * @fileoverview Middleware pipeline for Auwla server functions.
 */

import type { Middleware, ServerContext } from './types'

/**
 * Wrap a middleware function with a stable identity. Useful for type inference
 * and for any future middleware metadata we may attach.
 */
export function defineMiddleware<TParams = Record<string, string | string[]>>(
  middleware: Middleware<TParams>,
): Middleware<TParams> {
  return middleware
}

/**
 * Execute a stack of middleware around a handler.
 *
 * Each middleware receives ctx and next(). Calling next() runs the next
 * middleware (or the handler when no middleware remains).
 */
export async function runMiddleware(
  ctx: ServerContext,
  middleware: Middleware[],
  handler: () => Promise<unknown>,
): Promise<unknown> {
  let index = 0

  async function next(): Promise<unknown> {
    if (index >= middleware.length) {
      return handler()
    }
    const mw = middleware[index++]!
    return mw(ctx, next)
  }

  return next()
}
