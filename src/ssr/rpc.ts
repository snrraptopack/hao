/**
 * @fileoverview Server-side RPC resolution for Auwla SSR.
 *
 * During SSR, `track.get()` / `track.post()` / `routed` must resolve directly
 * to server functions instead of issuing network requests. This module provides
 * an invoker that looks up the key in the server manifest, builds a request
 * context, and runs the remote function with its middleware.
 */

import { createContext, extractRouteParams } from '../adapters/fetch'
import { runWithContext } from '../server/context'
import { runMiddleware } from '../server/pipeline'
import type { RemoteFunction, ServerManifest } from '../server/types'
import type { SsrRpcInvoker } from './invoker'

export type {SsrRpcInvoker}

function isRemoteFunction(value: unknown): value is RemoteFunction {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__auwla_remote' in value &&
    (value as Record<string, unknown>).__auwla_remote === true
  )
}

function defaultLoad(modulePath: string): Promise<Record<string, unknown>> {
  return import(/* @vite-ignore */ modulePath)
}

/**
 * Create an SSR RPC invoker backed by a server manifest.
 *
 * The invoker is bound to a single incoming request so cookies, headers, and
 * middleware see the correct context.
 */
export function createSsrRpcInvoker(
  manifest: ServerManifest,
  request: Request,
  load: (modulePath: string) => Promise<Record<string, unknown>> = defaultLoad,
): SsrRpcInvoker {
  return async function ssrRpcInvoker(
    key: string,
    args: unknown[],
    routePath: string,
  ): Promise<unknown> {
    const entry = manifest[key]
    if (!entry) {
      throw new Error(`[auwla/ssr] Remote key not found in manifest: ${key}`)
    }

    const params = extractRouteParams(entry.routePattern, routePath, entry.params) ?? {}
    const ctx = createContext(request, entry, params, args)

    const mod = await load(entry.modulePath)
    const exported = mod[entry.exportName]
    if (typeof exported !== 'function' && !isRemoteFunction(exported)) {
      throw new Error(`[auwla/ssr] Export "${entry.exportName}" is not a function`)
    }

    return runWithContext(ctx, () => {
      if (isRemoteFunction(exported)) {
        return runMiddleware(ctx, exported.middleware, () => exported.handler(ctx, ...args))
      }
      return runMiddleware(ctx, [], async () =>
        (exported as (...args: unknown[]) => unknown)(...args),
      )
    })
  }
}
