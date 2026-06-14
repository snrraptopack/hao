/**
 * @fileoverview remote.get / remote.post helpers for declaring server functions.
 */

import type { Middleware, RemoteFunction, RemoteMethod, ServerContext } from './types'

function createRemote<
  TArgs extends unknown[],
  TReturn,
  TMethod extends RemoteMethod,
  TParams = Record<string, string | string[]>,
>(
  method: TMethod,
  middleware: Middleware<TParams>[],
  handler: (ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, TMethod, TParams> {
  return {
    __auwla_remote: true,
    method,
    middleware,
    handler,
  }
}

/**
 * Declare a GET remote function.
 *
 * Plain async functions exported from a .server.ts file are also treated as
 * GET by default; remote.get is only needed when you want explicit typing or
 * when adding middleware.
 *
 * Usage:
 *   remote.get(async (ctx) => { ... })
 *   remote.get([sessionMiddleware], async (ctx) => { ... })
 */
function get<
  TArgs extends unknown[] = [],
  TReturn = unknown,
  TParams = Record<string, string | string[]>,
>(
  middlewareOrHandler:
    | Middleware<TParams>[]
    | ((ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>),
  maybeHandler?: (ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'GET', TParams> {
  const middleware: Middleware<TParams>[] = Array.isArray(middlewareOrHandler)
    ? middlewareOrHandler
    : []
  const handler =
    maybeHandler ??
    (middlewareOrHandler as (ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>)
  return createRemote('GET', middleware, handler)
}

/**
 * Declare a POST remote function.
 *
 * Usage:
 *   remote.post([validate(schema)], async (ctx, data) => { ... })
 *   remote.post(async (ctx, data) => { ... })
 */
function post<
  TArgs extends unknown[] = [],
  TReturn = unknown,
  TParams = Record<string, string | string[]>,
>(
  middlewareOrHandler:
    | Middleware<TParams>[]
    | ((ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>),
  maybeHandler?: (ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'POST', TParams> {
  const middleware: Middleware<TParams>[] = Array.isArray(middlewareOrHandler)
    ? middlewareOrHandler
    : []
  const handler =
    maybeHandler ??
    (middlewareOrHandler as (ctx: ServerContext<TParams>, ...args: TArgs) => Promise<TReturn>)
  return createRemote('POST', middleware, handler)
}

export const remote = { get, post }
