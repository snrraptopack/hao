/**
 * @fileoverview WinterCG-compatible fetch adapter for Auwla fullstack.
 *
 * Exposes a single POST endpoint (default `/_auwla/rpc`) that receives:
 *   - JSON bodies
 *   - multipart/form-data bodies for file uploads
 *
 * The adapter resolves the remote key, extracts route params from the current
 * route path, runs the server function inside the AsyncLocalStorage request
 * context, and returns the serialized result.
 *
 * This adapter uses only Request/Response/URL/FormData and can be mounted in
 * any WinterCG runtime (Cloudflare Workers, Deno, Bun, Node 18+ fetch).
 */

import type { ServerContext, ServerManifest, ServerManifestEntry, CookieOptions } from '../server/types'
import { runWithContext } from '../server/context'
import { runMiddleware } from '../server/pipeline'
import type { RemoteFunction } from '../server/types'
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
  /** Runtime server manifest (from `auwla:server-manifest`). */
  manifest: ServerManifest
  /**
   * Custom module loader. Receives the `modulePath` from the manifest and must
   * return the module object. Defaults to a dynamic `import()`.
   */
  load?: (modulePath: string) => Promise<Record<string, unknown>>
  /** RPC endpoint path. Defaults to `/_auwla/rpc`. */
  rpcPath?: string
  /** Optional error logger. */
  onError?: (error: unknown, request: Request) => void
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

/**
 * Extract typed params from the current route path using the manifest's
 * route pattern and ordered param names.
 *
 * Supports:
 *   - "/posts/:id" with ["id"]
 *   - "/posts/:category/:id" with ["category", "id"]
 *   - "/posts/*" with ["slug"] → { slug: string[] }
 *   - "" → {}
 */
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

async function parseRpcRequest(request: Request): Promise<ParsedRpc> {
  const url = new URL(request.url)
  const queryKey = url.searchParams.get('key')
  const queryRoutePath = url.searchParams.get('routePath')

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.startsWith('multipart/form-data') || contentType.startsWith('application/x-www-form-urlencoded')) {
    const form = await request.formData()
    const key = queryKey ?? form.get('__auwla_key')
    const routePath = queryRoutePath ?? form.get('__auwla_routePath') ?? '/'
    if (typeof key !== 'string') {
      throw new Error('Missing remote function key in request')
    }
    // Attach the form fields needed by the remote function to a fresh FormData
    // instance so the single argument received by the handler is a clean body.
    const clean = new FormData()
    form.forEach((value, name) => {
      if (name === '__auwla_key' || name === '__auwla_routePath') return
      clean.append(name, value)
    })
    return { key, args: [clean], routePath: String(routePath) }
  }

  const text = await request.text()
  const payload = JSON.parse(text) as RpcPayload
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.key !== 'string' ||
    !Array.isArray(payload.args) ||
    typeof payload.routePath !== 'string'
  ) {
    throw new Error('Invalid RPC payload')
  }
  return payload as ParsedRpc
}

/**
 * Build a request object that middleware sees. For POST calls the body is
 * rewritten to the first serialized argument so validation middleware can
 * use `ctx.request.json()` without knowing about the RPC transport envelope.
 */
function buildMiddlewareRequest(request: Request, args: unknown[]): Request {
  if (args.length === 0) return request

  const first = args[0]
  if (first instanceof FormData) {
    // Strip the original content-type so the new Request can compute the correct
    // multipart boundary for the rewritten FormData body.
    const headers = new Headers(request.headers)
    headers.delete('content-type')
    return new Request(request, { body: first, headers })
  }

  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')
  return new Request(request, { body: JSON.stringify(first), headers })
}

function createContext(
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
): Promise<unknown> {
  const exported = mod[entry.exportName]
  if (typeof exported !== 'function' && !isRemoteFunction(exported)) {
    throw new Error(`Export "${entry.exportName}" is not a function`)
  }

  if (isRemoteFunction(exported)) {
    return runMiddleware(ctx, exported.middleware, () => exported.handler(ctx, ...args))
  }

  // Plain async function default: call with the declared arguments only.
  return (exported as (...args: unknown[]) => unknown)(...args)
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

/**
 * Create a WinterCG fetch handler for Auwla RPC.
 *
 * Usage:
 *   const handle = createFetchAdapter({ manifest, load })
 *   export default { fetch: handle }
 *
 * The returned function ignores requests that do not match `rpcPath` and
 * returns `undefined` so upstream wrappers (Hono/Bun/Express) can fall through
 * to the next handler.
 */
export function createFetchAdapter(options: FetchAdapterOptions) {
  const manifest = options.manifest
  const load = options.load ?? defaultLoad
  const rpcPath = options.rpcPath ?? DEFAULT_RPC_PATH
  const onError = options.onError

  return async function handle(
    request: Request,
    platform?: Record<string, unknown>,
  ): Promise<Response | undefined> {
    const url = new URL(request.url)
    if (url.pathname !== rpcPath) return undefined
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // CSRF check: verify Origin and Referer for mutations/POST calls
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
      } catch {
        // Ignore parsing issues, but if it successfully parsed ensure origin matches
      }
    }

    let payload: ParsedRpc
    try {
      payload = await parseRpcRequest(request)
    } catch (error) {
      onError?.(error, request)
      return errorResponse(error)
    }

    // Prototype Pollution Guard: enforce direct properties only
    if (!payload.key || !Object.hasOwn(manifest, payload.key)) {
      return errorResponse(new Error(`Remote key not found: ${payload.key}`))
    }
    const entry = manifest[payload.key]!

    const params = extractRouteParams(entry.routePattern, payload.routePath, entry.params)
    if (params === null) {
      return errorResponse(
        new Error(`Route path "${payload.routePath}" does not match pattern "${entry.routePattern}"`),
      )
    }

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
      contentType.includes('application/json') ||
      accept.includes('application/json') ||
      request.headers.get('x-requested-with') === 'XMLHttpRequest'

    try {
      const result = await runWithContext(ctx, () =>
        invokeRemote(entry, mod, ctx, payload.args),
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
