import type { Middleware, ServerContext, Locals } from './types'

/**
 * Wrap a middleware function with a stable identity. Useful for type inference
 * and for any future middleware metadata we may attach.
 */
export function defineMiddleware<
  TNewLocals = any,
  TParams = Record<string, string | string[]>,
  TPlatform = Record<string, any>,
  TLocals = any,
>(
  middleware: (
    ctx: ServerContext<TParams, TPlatform, TLocals>,
    next: () => Promise<unknown>,
  ) => Promise<unknown>,
): Middleware<TNewLocals, TParams, TPlatform, TLocals> {
  return middleware as Middleware<TNewLocals, TParams, TPlatform, TLocals>
}

/**
 * Compose multiple middleware functions into a single middleware.
 */
export function composeMiddleware<
  TNewLocals = Locals,
  TParams = Record<string, string | string[]>,
  TPlatform = Record<string, any>,
  TLocals = Locals,
>(
  ...middlewares: Middleware<any, TParams, TPlatform, any>[]
): Middleware<TNewLocals, TParams, TPlatform, TLocals> {
  const composed = async (
    ctx: ServerContext<TParams, TPlatform, TLocals>,
    next: () => Promise<unknown>,
  ) => {
    return runMiddleware(ctx as any, middlewares, next)
  }
  return composed as any
}

/**
 * Execute a stack of middleware around a handler.
 *
 * Each middleware receives ctx and next(). Calling next() runs the next
 * middleware (or the handler when no middleware remains).
 */
export async function runMiddleware(
  ctx: ServerContext<any, any, any>,
  middleware: Middleware<any, any, any, any>[],
  handler: () => Promise<unknown>,
): Promise<unknown> {
  let index = 0
  let lastCalledIndex = -1

  async function next(): Promise<unknown> {
    const currentIndex = index
    if (currentIndex <= lastCalledIndex) {
      throw new Error('Auwla: next() called multiple times in middleware chain.')
    }
    lastCalledIndex = currentIndex

    if (index >= middleware.length) {
      return handler()
    }
    const mw = middleware[index++]!
    return mw(ctx, next)
  }

  return next()
}
