/**
 * @fileoverview Direct server-side invocation of remote functions for SSR.
 *
 * This bypasses the network and calls the .server.ts export directly inside a
 * request context so getContext() / getParams() work during server rendering.
 */

import { runWithContext } from './context'
import { runMiddleware } from './pipeline'
import { parseBody } from './validate'
import type { ServerContext, ServerManifest, ServerManifestEntry, CookieOptions, Middleware, RemoteFunction } from './types'

export interface SsrInvokeOptions {
  /** Abort signal passed from track.get / track.post. */
  signal?: AbortSignal
  /** HTTP method to enforce for remote.post vs remote.get. */
  method?: 'GET' | 'POST'
  /** Global middlewares applied to every invocation. */
  globalMiddlewares?: Middleware<any, any, any, any>[]
  /** Module loader. Defaults to dynamic import. */
  load?: (modulePath: string) => Promise<Record<string, unknown>>
}

const defaultLoad: NonNullable<SsrInvokeOptions['load']> = (modulePath) =>
  import(/* @vite-ignore */ modulePath)

function getPathname(routePath: string): string {
  const queryIndex = routePath.indexOf('?')
  return queryIndex === -1 ? routePath : routePath.slice(0, queryIndex)
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const index = pair.indexOf('=')
    if (index === -1) continue
    const key = pair.substring(0, index).trim()
    const val = pair.substring(index + 1).trim()
    cookies[key] = decodeURIComponent(val)
  }
  return cookies
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`
  if (options.path) str += `; Path=${options.path}`
  if (options.domain) str += `; Domain=${options.domain}`
  if (options.secure) str += '; Secure'
  if (options.httpOnly) str += '; HttpOnly'
  if (options.sameSite) str += `; SameSite=${options.sameSite}`
  return str
}

export function extractRouteParams(
  routePattern: string,
  routePath: string,
  paramNames: string[],
): Record<string, string | string[]> | null {
  if (paramNames.length === 0 || routePattern === '') return {}

  const pathname = getPathname(routePath)

  if (routePattern.endsWith('/*')) {
    const base = routePattern.slice(0, -1)
    if (!pathname.startsWith(base)) return null
    const tail = pathname.slice(base.length)
    const slug = tail === '' ? [] : tail.split('/').filter(Boolean)
    return { [paramNames[0]!]: slug }
  }

  const patternParts = routePattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null

  const params: Record<string, string | string[]> = {}
  let nameIndex = 0
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i]!
    const value = pathParts[i]!
    if (part.startsWith(':')) {
      params[paramNames[nameIndex]!] = decodeURIComponent(value)
      nameIndex++
    } else if (part !== value) {
      return null
    }
  }
  return params
}

function buildMiddlewareRequest(
  request: Request,
  entry: ServerManifestEntry,
  args: unknown[],
): Request {
  const method = entry.method || request.method

  if (args.length === 0) {
    if (method !== request.method) {
      return new Request(request, { method })
    }
    return request
  }

  const first = args[0]
  if (first instanceof FormData) {
    const headers = new Headers(request.headers)
    headers.delete('content-type')
    return new Request(request, { body: first as any, headers, method })
  }

  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')
  return new Request(request, { body: JSON.stringify(first), headers, method })
}

function createContext(
  request: Request,
  entry: ServerManifestEntry,
  params: Record<string, string | string[]>,
  args: unknown[],
): ServerContext {
  const req = buildMiddlewareRequest(request, entry, args)
  const responseHeaders = new Headers()
  const cookieHeader = request.headers.get('cookie')
  const parsedCookies = parseCookies(cookieHeader)

  const cookies = {
    get(name: string): string | undefined {
      return parsedCookies[name]
    },
    set(name: string, value: string, options?: CookieOptions) {
      responseHeaders.append('set-cookie', serializeCookie(name, value, options))
    },
    delete(name: string, options?: Omit<CookieOptions, 'expires' | 'maxAge'>) {
      responseHeaders.append('set-cookie', serializeCookie(name, '', { ...options, maxAge: 0 }))
    },
  }

  return {
    request: req,
    params,
    route: {
      path: entry.routePattern || request.url,
      params,
    },
    locals: {},
    headers: responseHeaders,
    cookies,
    redirect(path: string) {
      const mergedHeaders = new Headers(responseHeaders)
      mergedHeaders.set('location', path)
      return new Response(null, { status: 302, headers: mergedHeaders })
    },
    parseBody() {
      return parseBody(req)
    },
  }
}

function isRemoteFunction(value: unknown): value is RemoteFunction {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__auwla_remote' in value &&
    (value as Record<string, unknown>).__auwla_remote === true
  )
}

async function invokeRemote(
  entry: ServerManifestEntry,
  mod: Record<string, unknown>,
  ctx: ServerContext,
  args: unknown[],
  globalMiddlewares: Middleware<any, any, any, any>[] = [],
): Promise<unknown> {
  const exported = mod[entry.exportName]
  if (typeof exported !== 'function' && !isRemoteFunction(exported)) {
    throw new Error(`Export "${entry.exportName}" is not a function`)
  }

  if (isRemoteFunction(exported)) {
    const stack = [...globalMiddlewares, ...exported.middleware]
    return runMiddleware(ctx, stack, () => exported.handler(ctx, ...args))
  }

  return runMiddleware(ctx, globalMiddlewares, async () =>
    (exported as (...args: unknown[]) => unknown)(...args),
  )
}

/**
 * Invoke a remote function directly on the server for SSR.
 */
export async function invokeRemoteServer(
  manifest: ServerManifest,
  key: string,
  args: unknown[],
  routePath: string,
  request: Request,
  options: SsrInvokeOptions = {},
): Promise<unknown> {
  if (options.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const entry = manifest[key]
  if (!entry) {
    throw new Error(`Auwla: remote function "${key}" not found in manifest`)
  }

  if (options.method && entry.method !== options.method) {
    throw new Error(`Auwla: remote function "${key}" expects ${entry.method} but got ${options.method}`)
  }

  const params = extractRouteParams(entry.routePattern, routePath, entry.params) ?? {}
  const ctx = createContext(request, entry, params, args)
  const load = options.load ?? defaultLoad
  const mod = await load(entry.modulePath)

  return runWithContext(ctx, () =>
    invokeRemote(entry, mod, ctx, args, options.globalMiddlewares),
  )
}
