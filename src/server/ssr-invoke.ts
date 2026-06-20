/**
 * @fileoverview Direct server-side invocation of remote functions for SSR.
 *
 * This bypasses the network and calls the .server.ts export directly inside a
 * request context so getContext() / getParams() work during server rendering.
 */

import { runWithContext } from './context'
import type { ServerManifest, Middleware } from './types'

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

import { defaultLoad, extractRouteParams, createContext, invokeRemote } from './utils'




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
