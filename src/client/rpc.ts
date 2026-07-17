/**
 * @fileoverview Client-side RPC dispatcher for Auwla fullstack.
 */

const RPC_ENDPOINT = '/_auwla/rpc'

export interface RpcPayload {
  key: string
  args: unknown[]
  routePath: string
}

export interface RpcOptions {
  signal?: AbortSignal
}

function isFormDataArgs(args: unknown[]): args is [FormData] {
  return args.length === 1 && args[0] instanceof FormData
}

function parseResponse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

let _rpcRoutePath: string | null = null
let _rpcRouteParams: Record<string, string | string[]> | null = null

/**
 * Provider interface installed by the SSR runtime (runtime/ssr.ts) so route
 * path/params are isolated per request via AsyncLocalStorage (B2). On the
 * client no provider is installed and the module-level fallbacks are used.
 */
interface RpcRouteContextProvider {
  getPath(): string | null
  getParams(): Record<string, string | string[]> | null
  setPath(path: string | null): void
  setParams(params: Record<string, string | string[]> | null): void
}

function getRouteContextProvider(): RpcRouteContextProvider | null {
  return (globalThis as any).__auwla_routeContextProvider ?? null
}

/**
 * Set the route path that track.get / track.post should use for the current RPC call.
 * @internal
 */
export function setRpcRoutePath(path: string | null): string | null {
  const provider = getRouteContextProvider()
  if (provider) {
    const prev = provider.getPath()
    provider.setPath(path)
    return prev
  }
  const prev = _rpcRoutePath
  _rpcRoutePath = path
  return prev
}

/**
 * Set the active route parameters for upcoming RPC calls.
 * @internal
 */
export function setRpcRouteParams(params: Record<string, string | string[]> | null): Record<string, string | string[]> | null {
  const provider = getRouteContextProvider()
  if (provider) {
    const prev = provider.getParams()
    provider.setParams(params)
    return prev
  }
  const prev = _rpcRouteParams
  _rpcRouteParams = params
  return prev
}

/**
 * Get the current route parameters.
 */
export function getCurrentRouteParams(): Record<string, string | string[]> {
  const provider = getRouteContextProvider()
  if (provider) return provider.getParams() ?? {}
  return _rpcRouteParams ?? {}
}

export function getCurrentRoutePath(): string {
  const provider = getRouteContextProvider()
  if (provider) return provider.getPath() ?? '/'
  if (_rpcRoutePath !== null) return _rpcRoutePath
  if (typeof window === 'undefined') return '/'
  return window.location.pathname + window.location.search
}

/**
 * Perform an RPC call to the server.
 */
export async function rpcCall(
  key: string,
  args: unknown[],
  routePath: string,
  options?: RpcOptions & { method?: 'GET' | 'POST' },
): Promise<unknown> {
  const method = options?.method ?? 'POST'
  const routeParams = getCurrentRouteParams()

  let response: Response

  if (method === 'GET') {
    const url = new URL(RPC_ENDPOINT, window.location.origin)
    url.searchParams.set('key', key)
    url.searchParams.set('routePath', routePath)
    url.searchParams.set('params', JSON.stringify(routeParams))
    if (args.length > 0) {
      url.searchParams.set('args', JSON.stringify(args))
    }

    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
      signal: options?.signal,
    })
  } else {
    const payload = { key, args, routePath, routeParams }
    let body: BodyInit
    let headers: HeadersInit = {}

    if (isFormDataArgs(args)) {
      const form = new FormData()
      args[0].forEach((value, name) => {
        form.append(name, value)
      })
      form.append('__auwla_key', key)
      form.append('__auwla_routePath', routePath)
      form.append('__auwla_routeParams', JSON.stringify(routeParams))
      body = form
    } else {
      body = JSON.stringify(payload)
      headers = {
        'content-type': 'application/json',
        'accept': 'application/json',
      }
    }

    response = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers,
      body,
      signal: options?.signal,
    })
  }

  if (!response) {
    throw new Error('RPC: fetch call returned undefined response. If in tests, ensure fetch is mocked properly.');
  }

  const text = await response.text()

  if (!response.ok) {
    let error: Error
    try {
      const parsed = parseResponse(text) as Record<string, unknown> | null
      error = new Error(
        String((parsed && typeof parsed === 'object' && parsed.message) ?? parsed ?? `RPC failed: ${response.status}`),
      )
      if (parsed && typeof parsed === 'object') {
        ;(error as any).details = parsed
      }
    } catch {
      error = new Error(`RPC failed: ${response.status} ${text.slice(0, 200)}`)
    }
    throw error
  }

  return parseResponse(text)
}
