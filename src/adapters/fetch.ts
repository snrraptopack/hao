/**
 * @fileoverview WinterCG-compatible fetch adapter for Auwla fullstack.
 */

import type { ServerManifest } from '../server/types'
import { runWithContext } from '../server/context'
import type { Middleware } from '../server/types'
import { ValidationError } from '../server/validate'
import { HttpError } from '../server/errors'

const DEFAULT_RPC_PATH = '/_auwla/rpc'

import { defaultLoad, extractRouteParams, createContext, invokeRemote, getRegisteredServerManifest, importServerManifestVirtualModule } from '../server/utils'

export { extractRouteParams }

export interface FetchAdapterOptions {
  manifest?: ServerManifest
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



function serialize(result: unknown): Response {
  if (result instanceof Response) return result
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(error: unknown): Response {
  if (error instanceof Response) return error

  const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
  const isValidation = error instanceof ValidationError || (error instanceof Error && error.name === 'ValidationError')
  // Only genuine HttpErrors expose their status/message/details to clients.
  // Duck-typing any error with a numeric `.status` would leak internals, and
  // `instanceof` alone breaks across duplicate module copies — hence the
  // prototype-brand check (see server/errors.ts).
  const isHttpError = error instanceof HttpError || (error instanceof Error && (error as any).__auwla_httpError === true)

  const status = isValidation ? 400 : isHttpError ? (error as HttpError).status : 500

  const expose = isValidation || isHttpError || !isProd
  const payload = {
    message: expose
      ? (error instanceof Error ? error.message : String(error))
      : 'Internal Server Error',
    name: expose && error instanceof Error ? error.name : 'Error',
    issues: isValidation ? (error as any).issues : undefined,
    details: isHttpError ? (error as HttpError).details : undefined,
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * A redirect target is only safe when it is a same-origin relative path:
 * exactly one leading `/` (no protocol-relative `//host`), no backslashes
 * (browsers normalize `\/` and `\\` to `/`, which would smuggle `//host`),
 * and therefore no scheme. Anything else is an open-redirect vector.
 */
function isSafeRedirectPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
}

export function createFetchAdapter(options: FetchAdapterOptions = {}) {
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

    let manifest = options.manifest ?? getRegisteredServerManifest()
    if (!manifest) {
      manifest = await importServerManifestVirtualModule()
      if (!manifest) {
        throw new Error('Auwla: Server manifest was not provided and virtual module auwla:server-manifest could not be loaded.')
      }
    }
    
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

    if (!payload.key || !manifest || !Object.hasOwn(manifest, payload.key)) {
      return errorResponse(new Error(`Remote key not found: ${payload.key}`))
    }
    const entry = manifest[payload.key]!

    if (entry.method !== request.method) {
      return new Response(`Method not allowed: Endpoint expects ${entry.method}`, { status: 405 })
    }

    const extractedParams = extractRouteParams(entry.routePattern, payload.routePath, entry.params)
    if (extractedParams === null) {
      // The entry declares a parameterized route pattern and the supplied
      // routePath does not match it. Reject instead of falling back to
      // client-supplied routeParams, which would let callers forge ctx.params.
      return errorResponse(new HttpError(400, `Route path does not match endpoint pattern: ${entry.routePattern}`))
    }
    // extractRouteParams only returns null for parameterized patterns. For
    // entries without declared params (shared src/server functions use an
    // empty routePattern) there is nothing to extract, so client-supplied
    // params are the only source.
    const params = entry.params.length > 0
      ? extractedParams
      : (payload.routeParams ?? extractedParams)

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
        // Non-fetch form POSTs redirect back to the page. payload.routePath is
        // client-controlled (form field or query param), so only same-origin
        // relative paths may be used as a redirect target — anything else is
        // an open-redirect vector and is rejected with 400 (the stricter
        // choice over silently falling back to the JSON response).
        if (!isSafeRedirectPath(payload.routePath)) {
          return errorResponse(new HttpError(400, 'Invalid redirect path'))
        }
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
