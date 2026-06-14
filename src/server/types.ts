/**
 * @fileoverview Core types for Auwla server-side remote functions.
 *
 * Nothing in this file is imported by client code. It is used by:
 *   - the Vite plugin when generating the server manifest
 *   - the server runtime (remote.get/post, defineMiddleware, getContext)
 *   - the RPC adapter that dispatches incoming requests to server functions
 */

/**
 * HTTP methods supported by remote functions.
 *
 * Plain async functions default to GET. Mutations must be declared with
 * remote.post(...) so the adapter rejects GET requests.
 */
export type RemoteMethod = 'GET' | 'POST'

/**
 * A request-scoped value bag. Middleware can write arbitrary data here and
 * downstream middleware/handlers can read it.
 */
export type Locals = Record<string, unknown>

/**
 * Shape of the current route as seen by server functions. This is a subset
 * of the router's MatchedRoute, available on the server without importing
 * router internals.
 */
export interface ServerRouteInfo {
  /** Normalised route path, e.g. "/posts/:id". */
  path: string
  /** Route params extracted from the URL. */
  params: Record<string, string | string[]>
}

/**
 * Context available inside every server function and middleware.
 *
 * Params are typed based on the location of the .server.ts file:
 *   - src/pages/posts/[id].server.ts  → { id: string }
 *   - src/pages/posts/[...slug].server.ts → { slug: string[] }
 *   - src/pages/posts/index.server.ts → {}
 */
export interface ServerContext<
  Params = Record<string, string | string[]>,
  Platform = Record<string, any>
> {
  /** The incoming request. */
  request: Request
  /** Typed route params. */
  params: Params
  /** Info about the matched route. */
  route: ServerRouteInfo
  /** Request-scoped bag for middleware-passed data. */
  locals: Locals
  /**
   * Produce a redirect response. Throwing the returned response is the
   * recommended way to redirect from inside a remote function.
   */
  redirect(path: string): Response
  /**
   * Parse the request body as JSON or FormData depending on the Content-Type.
   */
  parseBody(): Promise<unknown>
  /** Native platform-specific context (e.g. Hono's Context c) */
  platform?: Platform
}

/**
 * A middleware function runs before the target remote function. It can
 * modify ctx.locals, short-circuit with a redirect/error, or call next()
 * to continue to the next middleware/handler.
 */
export type Middleware<
  TParams = Record<string, string | string[]>,
  TPlatform = Record<string, any>
> = (
  ctx: ServerContext<TParams, TPlatform>,
  next: () => Promise<unknown>,
) => Promise<unknown>

/**
 * Branded wrapper returned by remote.get / remote.post. The adapter uses
 * this to identify callable functions and enforce the declared HTTP method.
 */
export interface RemoteFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown,
  TMethod extends RemoteMethod = RemoteMethod,
  TParams = Record<string, string | string[]>,
  TPlatform = Record<string, any>,
> {
  __auwla_remote: true
  method: TMethod
  middleware: Middleware<TParams, TPlatform>[]
  handler: (ctx: ServerContext<TParams, TPlatform>, ...args: TArgs) => Promise<TReturn>
}

/**
 * Runtime manifest entry for a single remote function.
 */
export interface ServerManifestEntry {
  /** Fully resolved path to the .server.ts module. */
  modulePath: string
  /** Named export to call. */
  exportName: string
  /** Declared HTTP method. */
  method: RemoteMethod
  /**
   * URL route pattern used by the adapter to extract params from the current
   * route path. Empty string for shared server-dir functions.
   * Examples: "/posts", "/posts/:id", "*"
   */
  routePattern: string
  /**
   * Ordered param names extracted from the route pattern.
   *   "/posts/:id"          → ["id"]
   *   "/posts/:category/:id" → ["category", "id"]
   *   "*"                   → ["slug"] (from [...slug])
   *   ""                    → []
   */
  params: string[]
  /** Generated TypeScript type string for route params. */
  paramsType: string
  /** Generated TypeScript type strings for function arguments. */
  argsType: string[]
  /** Generated TypeScript type string for the return value. */
  returnType: string
}

/**
 * Runtime manifest mapping remote keys to their server implementation.
 *
 * Keys are "routeName.exportName", e.g.:
 *   { "posts.getPosts": { ... }, "posts.createPost": { ... } }
 */
export type ServerManifest = Record<string, ServerManifestEntry>

/**
 * Generated type interface consumed by track.get / track.post for type
 * checking. The Vite plugin writes this into .auwla/server-manifest.d.ts
 * and augments the 'auwla/server-manifest' module.
 */
export interface ServerManifestTypes {
  [key: string]: {
    method: RemoteMethod
    params: Record<string, unknown>
    args: unknown[]
    return: unknown
  }
}
