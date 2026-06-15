import type { Middleware, RemoteFunction, Locals, ServerContext } from './types'

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

type LocalsFromMiddleware<TMw> = TMw extends readonly Middleware<any, any, any, any>[]
  ? UnionToIntersection<{
      [K in keyof TMw]: TMw[K] extends Middleware<infer TNew, any, any, any> ? TNew : never
    }[number]> extends never
    ? Locals
    : Locals & UnionToIntersection<{
        [K in keyof TMw]: TMw[K] extends Middleware<infer TNew, any, any, any> ? TNew : never
      }[number]>
  : Locals

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
  handler: (ctx: ServerContext<TParams, any, Locals>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'GET', TParams, any, Locals>

function get<
  TArgs extends unknown[] = [],
  TReturn = unknown,
  TParams = Record<string, string | string[]>,
  const TMw extends readonly Middleware<any, TParams, any, any>[] = readonly Middleware<any, TParams, any, any>[],
>(
  middleware: TMw,
  handler: (ctx: ServerContext<TParams, any, LocalsFromMiddleware<TMw>>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'GET', TParams, any, LocalsFromMiddleware<TMw>>

function get<
  TArgs extends unknown[] = [],
  TReturn = unknown,
  TParams = Record<string, string | string[]>,
  const TMw extends readonly Middleware<any, TParams, any, any>[] = [],
>(
  middlewareOrHandler:
    | TMw
    | ((ctx: ServerContext<TParams, any, Locals>, ...args: TArgs) => Promise<TReturn>),
  maybeHandler?: (ctx: ServerContext<TParams, any, LocalsFromMiddleware<TMw>>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'GET', TParams, any, any> {
  const middleware = Array.isArray(middlewareOrHandler)
    ? middlewareOrHandler
    : []
  const handler =
    maybeHandler ??
    (middlewareOrHandler as any)
  return {
    __auwla_remote: true,
    method: 'GET',
    middleware: middleware as any,
    handler,
  }
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
  handler: (ctx: ServerContext<TParams, any, Locals>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'POST', TParams, any, Locals>

function post<
  TArgs extends unknown[] = [],
  TReturn = unknown,
  TParams = Record<string, string | string[]>,
  const TMw extends readonly Middleware<any, TParams, any, any>[] = readonly Middleware<any, TParams, any, any>[],
>(
  middleware: TMw,
  handler: (ctx: ServerContext<TParams, any, LocalsFromMiddleware<TMw>>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'POST', TParams, any, LocalsFromMiddleware<TMw>>

function post<
  TArgs extends unknown[] = [],
  TReturn = unknown,
  TParams = Record<string, string | string[]>,
  const TMw extends readonly Middleware<any, TParams, any, any>[] = [],
>(
  middlewareOrHandler:
    | TMw
    | ((ctx: ServerContext<TParams, any, Locals>, ...args: TArgs) => Promise<TReturn>),
  maybeHandler?: (ctx: ServerContext<TParams, any, LocalsFromMiddleware<TMw>>, ...args: TArgs) => Promise<TReturn>,
): RemoteFunction<TArgs, TReturn, 'POST', TParams, any, any> {
  const middleware = Array.isArray(middlewareOrHandler)
    ? middlewareOrHandler
    : []
  const handler =
    maybeHandler ??
    (middlewareOrHandler as any)
  return {
    __auwla_remote: true,
    method: 'POST',
    middleware: middleware as any,
    handler,
  }
}

export const remote = { get, post }
