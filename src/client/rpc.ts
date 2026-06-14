/**
 * @fileoverview Client-side RPC dispatcher for Auwla fullstack.
 *
 * Called by track.get / track.post. Serializes arguments as JSON and POSTs
 * them to the adapter endpoint. The adapter resolves the remote key, extracts
 * route params from routePath, runs the server function, and returns the JSON
 * result.
 */

const RPC_ENDPOINT = '/_auwla/rpc'

/**
 * Payload sent to the RPC adapter for JSON requests.
 */
export interface RpcPayload {
  /** Remote key, e.g. "posts.getPost". */
  key: string
  /** Positional arguments for the remote function. */
  args: unknown[]
  /** Current route path, used by the adapter to extract params. */
  routePath: string
}

export interface RpcOptions {
  signal?: AbortSignal
}

/**
 * Determine whether the arguments should be sent as multipart/form-data
 * (single FormData body) instead of JSON.
 */
function isFormDataArgs(args: unknown[]): args is [FormData] {
  return args.length === 1 && args[0] instanceof FormData
}

/**
 * Build a request body for an RPC call.
 *
 * Plain object args are serialized with JSON. A single FormData argument is
 * forwarded as multipart/form-data with the remote key and route path attached
 * as hidden fields.
 */
function buildRequest(
  key: string,
  args: unknown[],
  routePath: string,
): { body: BodyInit; headers: HeadersInit } {
  if (isFormDataArgs(args)) {
    const form = new FormData()
    args[0].forEach((value, name) => {
      form.append(name, value)
    })
    form.append('__auwla_key', key)
    form.append('__auwla_routePath', routePath)
    return { body: form, headers: {} }
  }

  const payload: RpcPayload = { key, args, routePath }
  return {
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  }
}

/**
 * Parse a successful RPC response.
 *
 * The adapter returns JSON. The fallback to the raw text handles non-JSON
 * responses from user-returned Responses.
 */
function parseResponse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Perform an RPC call to the server.
 *
 * @param key Remote function key from the manifest.
 * @param args Arguments to pass to the function.
 * @param routePath Current browser route path.
 * @param options Optional abort signal.
 */
export async function rpcCall(
  key: string,
  args: unknown[],
  routePath: string,
  options?: RpcOptions,
): Promise<unknown> {
  const { body, headers } = buildRequest(key, args, routePath)

  const response = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers,
    body,
    signal: options?.signal,
  })

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

let _rpcRoutePath: string | null = null

/**
 * Set the route path that track.get / track.post should use for the current
 * RPC call. The Router calls this before invoking a route's `routed` loader so
 * the server receives the exact path the loader was started for, even when the
 * browser's URL has not fully committed yet.
 *
 * @returns The previous path so the caller can restore it.
 * @internal
 */
export function setRpcRoutePath(path: string | null): string | null {
  const prev = _rpcRoutePath
  _rpcRoutePath = path
  return prev
}

/**
 * Read the current route path used for RPC calls.
 *
 * Priority:
 *   1. Path explicitly set by the Router for the active loader.
 *   2. window.location.pathname + search for direct track.get/track.post calls.
 *   3. "/" during SSR or when window is unavailable.
 */
export function getCurrentRoutePath(): string {
  if (_rpcRoutePath !== null) return _rpcRoutePath
  if (typeof window === 'undefined') return '/'
  return window.location.pathname + window.location.search
}
