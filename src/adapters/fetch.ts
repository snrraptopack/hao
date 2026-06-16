/**
 * @fileoverview WinterCG-compatible fetch adapter for Auwla fullstack.
 */

import type { ServerContext, ServerManifest, ServerManifestEntry, CookieOptions } from '../server/types'
import { runWithContext } from '../server/context'
import { runMiddleware } from '../server/pipeline'
import type { RemoteFunction, Middleware } from '../server/types'
import { ValidationError, parseBody } from '../server/validate'
import { HttpError } from '../server/errors'

const DEFAULT_RPC_PATH = '/_auwla/rpc'

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
  if (options.maxAge !== undefined) {
    str += `; Max-Age=${options.maxAge}`
  }
  if (options.expires) {
    str += `; Expires=${options.expires.toUTCString()}`
  }
  if (options.path) {
    str += `; Path=${options.path}`
  }
  if (options.domain) {
    str += `; Domain=${options.domain}`
  }
  if (options.secure) {
    str += '; Secure'
  }
  if (options.httpOnly) {
    str += '; HttpOnly'
  }
  if (options.sameSite) {
    str += `; SameSite=${options.sameSite}`
  }
  return str
}

export interface FetchAdapterOptions {
  manifest: ServerManifest
  load?: (modulePath: string) => Promise<Record<string, unknown>>
  rpcPath?: string
  onError?: (error: unknown, request: Request) => void
  middlewares?: Middleware<any, any, any, any>[]
}

export interface RpcPayload {
  key: string
  args: unknown[]
  routePath: string
}

interface ParsedRpc {
  key: string
  args: unknown[]
  routePath: string
}

function defaultLoad(modulePath: string): Promise<Record<string, unknown>> {
  return import(/* @vite-ignore */ modulePath)
}

function getPathname(routePath: string): string {
  const queryIndex = routePath.indexOf('?')
  return queryIndex === -1 ? routePath : routePath.slice(0, queryIndex)
}

export function extractRouteParams(
  routePattern: string,
  routePath: string,
  paramNames: string[],
): Record<string, string | string[]> | null {
  if (paramNames.length === 0 || routePattern === '') {
    return {}
  }

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

async function parseRpcRequest(request: Request): Promise<ParsedRpc & { routeParams?: Record<string, any> }> {
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const key = url.searchParams.get('key')
    const routePath = url.searchParams.get('routePath') ?? '/'
    const rawParams = url.searchParams.get('params')
    const rawArgs = url.searchParams.get('args')

    if (!key) {
      throw new Error('Missing remote function key in request')
    }

    const args = rawArgs ? JSON.parse(rawArgs) : []
    const routeParams = rawParams ? JSON.parse(rawParams) : {}

    return { key, args, routePath, routeParams }
  }

  const queryKey = url.searchParams.get('key')
  const queryRoutePath = url.searchParams.get('routePath')
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.startsWith('multipart/form-data') || contentType.startsWith('application/x-www-form-urlencoded')) {
    const form = await request.formData()
    const key = queryKey ?? form.get('__auwla_key')
    const routePath = queryRoutePath ?? form.get('__auwla_routePath') ?? '/'
    const rawParams = form.get('__auwla_routeParams')

    if (typeof key !== 'string') {
      throw new Error('Missing remote function key in request')
    }

    const routeParams = typeof rawParams === 'string' ? JSON.parse(rawParams) : {}
    const clean = new FormData()
    form.forEach((value, name) => {
      if (name === '__auwla_key' || name === '__auwla_routePath' || name === '__auwla_routeParams') return
      clean.append(name, value)
    })
    return { key, args: [clean], routePath: String(routePath), routeParams }
  }

  const text = await request.text()
  const payload = JSON.parse(text) as RpcPayload & { routeParams?: Record<string, any> }
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.key !== 'string' ||
    !Array.isArray(payload.args) ||
    typeof payload.routePath !== 'string'
  ) {
    throw new Error('Invalid RPC payload')
  }
  return payload as ParsedRpc & { routeParams?: Record<string, any> }
}

function buildMiddlewareRequest(request: Request, args: unknown[]): Request {
  if (args.length === 0) return request

  const first = args[0]
  if (first instanceof FormData) {
    const headers = new Headers(request.headers)
    headers.delete('content-type')
    return new Request(request, { body: first, headers })
  }

  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')
  return new Request(request, { body: JSON.stringify(first), headers })
}

export function createContext(
  request: Request,
  entry: ServerManifestEntry,
  params: Record<string, string | string[]>,
  args: unknown[],
  platform?: Record<string, unknown>,
): ServerContext {
  const req = buildMiddlewareRequest(request, args)
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
    }
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
    platform,
  }
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

function isRemoteFunction(value: unknown): value is RemoteFunction {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__auwla_remote' in value &&
    (value as Record<string, unknown>).__auwla_remote === true
  )
}

function serialize(result: unknown): Response {
  if (result instanceof Response) return result
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(error: unknown): Response {
  if (error instanceof Response) return error

  const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
  const isValidation = error instanceof ValidationError
  const isHttpError = error instanceof HttpError
  
  const status = isValidation ? 400 : isHttpError ? error.status : 500

  const message = (isValidation || isHttpError || !isProd)
    ? (error instanceof Error ? error.message : String(error))
    : 'Internal Server Error'

  const payload = {
    message,
    name: (isValidation || isHttpError || !isProd) ? (error instanceof Error ? error.name : 'Error') : 'Error',
    issues: isValidation ? error.issues : undefined,
    details: isHttpError ? error.details : undefined,
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function createFetchAdapter(options: FetchAdapterOptions) {
  const manifest = options.manifest
  const load = options.load ?? defaultLoad
  const rpcPath = options.rpcPath ?? DEFAULT_RPC_PATH
  const onError = options.onError
  const globalMiddlewares = options.middlewares ?? []

  return async function handle(
    request: Request,
    platform?: Record<string, unknown>,
  ): Promise<Response | undefined> {
    const url = new URL(request.url)
    if (url.pathname !== rpcPath) return undefined
    
    if (request.method !== 'POST' && request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    if (request.method === 'POST') {
      const origin = request.headers.get('origin')
      const referer = request.headers.get('referer')
      const requestOrigin = new URL(request.url, 'http://localhost').origin

      if (origin && origin !== requestOrigin) {
        return errorResponse(new Error('CSRF Blocked: Origin mismatch'))
      } else if (!origin && referer) {
        try {
          const refererOrigin = new URL(referer).origin
          if (refererOrigin !== requestOrigin) {
            return errorResponse(new Error('CSRF Blocked: Referer mismatch'))
          }
        } catch {}
      }
    }

    let payload: ParsedRpc & { routeParams?: Record<string, any> }
    try {
      payload = await parseRpcRequest(request)
    } catch (error) {
      onError?.(error, request)
      return errorResponse(error)
    }

    if (!payload.key || !Object.hasOwn(manifest, payload.key)) {
      return errorResponse(new Error(`Remote key not found: ${payload.key}`))
    }
    const entry = manifest[payload.key]!

    if (entry.method !== request.method) {
      return new Response(`Method not allowed: Endpoint expects ${entry.method}`, { status: 405 })
    }

    const params = extractRouteParams(entry.routePattern, payload.routePath, entry.params)
      ?? payload.routeParams
      ?? {}

    let mod: Record<string, unknown>
    try {
      mod = await load(entry.modulePath)
    } catch (error) {
      onError?.(error, request)
      return errorResponse(error)
    }

    const ctx = createContext(request, entry, params, payload.args, platform)
    const contentType = request.headers.get('content-type') ?? ''
    const accept = request.headers.get('accept') ?? ''
    const isFetch =
      request.method === 'GET' ||
      contentType.includes('application/json') ||
      accept.includes('application/json') ||
      request.headers.get('x-requested-with') === 'XMLHttpRequest'

    try {
      const result = await runWithContext(ctx, () =>
        invokeRemote(entry, mod, ctx, payload.args, globalMiddlewares),
      )
      let response: Response
      if (result instanceof Response) {
        response = result
      } else if (!isFetch) {
        response = new Response(null, {
          status: 303,
          headers: { location: payload.routePath },
        })
      } else {
        response = serialize(result)
      }

      if (request.method === 'GET') {
        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
      }

      try {
        ctx.headers.forEach((value, name) => {
          if (name.toLowerCase() === 'set-cookie') {
            response.headers.append(name, value)
          } else {
            response.headers.set(name, value)
          }
        })
      } catch {
        const headers = new Headers(response.headers)
        ctx.headers.forEach((value, name) => {
          if (name.toLowerCase() === 'set-cookie') {
            headers.append(name, value)
          } else {
            headers.set(name, value)
          }
        })
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      }
      return response
    } catch (error) {
      onError?.(error, request)
      return errorResponse(error)
    }
  }
}
