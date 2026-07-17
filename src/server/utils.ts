import type { CookieOptions, ServerManifest, ServerManifestEntry, ServerContext, RemoteFunction, Middleware } from './types'
import { runMiddleware } from './pipeline'
import { parseBody } from './validate'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function defaultLoad(modulePath: string): Promise<Record<string, unknown>> {
  const viteServer = (globalThis as any).__auwla_vite_server
  const isAbsolute = /^([a-zA-Z]:[\\/]|\/|file:)/.test(modulePath)
  if (viteServer) {
    if (!isAbsolute) {
      // Root-relative manifest path (S6): resolve against the Vite root.
      const root = String(viteServer.config?.root ?? '')
        .replace(/\\/g, '/')
        .replace(/^\//, '')
        .replace(/\/$/, '')
      return viteServer.ssrLoadModule(`/@fs/${root}/${modulePath}`)
    }
    let viteUrl = modulePath.replace(/\\/g, '/')
    if (viteUrl.match(/^[a-zA-Z]:\//) || viteUrl.startsWith('/')) {
      viteUrl = `/@fs/${viteUrl.replace(/^\//, '')}`
    }
    return viteServer.ssrLoadModule(viteUrl)
  }
  if (!isAbsolute) {
    // Root-relative manifest path in production: resolve against an explicit
    // server root when set, else the process working directory.
    const base = (globalThis as any).__auwla_serverRoot
      ?? (typeof process !== 'undefined' ? process.cwd() : '')
    modulePath = pathToFileURL(resolve(base, modulePath)).href
  } else if (typeof process !== 'undefined' && process.platform === 'win32' && modulePath.match(/^[a-zA-Z]:\\/)) {
    // In Node.js production, absolute Windows paths need file:/// prefix
    modulePath = `file:///${modulePath.replace(/\\/g, '/')}`
  }
  return import(/* @vite-ignore */ modulePath)
}

export function getPathname(routePath: string): string {
  const queryIndex = routePath.indexOf('?')
  return queryIndex === -1 ? routePath : routePath.slice(0, queryIndex)
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
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

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
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

export function buildMiddlewareRequest(
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

  // GET/HEAD requests cannot carry a body — `new Request(req, { body })`
  // throws in undici. Args for GET remotes arrive via the query string and
  // are passed to the handler as positional arguments; `ctx.parseBody()`
  // falls back to the first arg (see createContext) so validate() middleware
  // keeps working on GET endpoints.
  // (RemoteMethod is only 'GET' | 'POST'; the HEAD check guards requests
  // whose entry method is falsy and request.method is HEAD at runtime.)
  if (method === 'GET' || (method as string) === 'HEAD') {
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

export function createContext(
  request: Request,
  entry: ServerManifestEntry,
  params: Record<string, string | string[]>,
  args: unknown[],
  platform?: Record<string, unknown>,
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
      // GET/HEAD requests carry no body (see buildMiddlewareRequest); the
      // first RPC arg doubles as the "body" so validate() middleware can
      // still validate input on remote.get endpoints with args.
      if ((req.method === 'GET' || req.method === 'HEAD') && args.length > 0) {
        return Promise.resolve(args[0])
      }
      return parseBody(req)
    },
    platform,
  }
}

/**
 * Resolve the server manifest without statically importing the virtual
 * module. The generated `auwla:server-manifest` module (and the emitted
 * `.auwla/server-manifest.js`) self-registers here — deliberate global state:
 * it survives double module loading when the manifest and the adapter end up
 * in separate bundles or module instances.
 */
export function getRegisteredServerManifest(): ServerManifest | undefined {
  return (globalThis as any).__auwla_serverManifest
}

/**
 * Last-resort lazy load of the `auwla:server-manifest` virtual module.
 * The specifier is hidden behind a variable (+ `/* @vite-ignore *\/`) so vite
 * import-analysis cannot statically resolve it — the virtual module only
 * exists inside the router plugin. In plain node/test environments the
 * import simply rejects and the caller falls back gracefully.
 */
export async function importServerManifestVirtualModule(): Promise<ServerManifest | undefined> {
  const specifier = 'auwla:server-manifest'
  try {
    const mod = await import(/* @vite-ignore */ specifier)
    return mod.default as ServerManifest
  } catch {
    return undefined
  }
}

export function isRemoteFunction(value: unknown): value is RemoteFunction {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__auwla_remote' in value &&
    (value as Record<string, unknown>).__auwla_remote === true
  )
}

export async function invokeRemote(
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
