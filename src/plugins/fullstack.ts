/**
 * Fullstack Plugin
 * 
 * Provides a type-safe API client to page and layout components.
 * This is useful when using auwsomebridge or similar RPC solutions.
 * 
 * @example
 * ```typescript
 * import { $api } from './server/client-api'
 * 
 * const Page = definePage(
 *   (ctx) => {
 *     const user = createResource('user', () => ctx.$api.getUser({ id: ctx.params.id }))
 *     return <div>{user.data.value?.name}</div>
 *   },
 *   [fullstackPlugin($api)]
 * )
 * ```
 */

import { definePlugin } from '../plugin'

/**
 * Create a fullstack plugin that injects an API client into the page context.
 * 
 * @param apiClient - The API client object (e.g., from auwsomebridge)
 * @returns A plugin that provides the API client as `ctx.$api`
 * 
 * @example
 * ```typescript
 * import { setupBridge } from 'auwsomebridge'
 * import { allRoutes } from './server/routes'
 * 
 * const { $api } = setupBridge(allRoutes, { prefix: '/api' })
 * 
 * // Create the plugin
 * const apiPlugin = fullstackPlugin($api)
 * 
 * // Use in pages
 * const Page = definePage(
 *   (ctx) => {
 *     ctx.$api.getUser({ id: '1' }) // Type-safe!
 *     return <div/>
 *   },
 *   [apiPlugin]
 * )
 * ```
 */
export function fullstackPlugin<Api extends Record<string, any>>(apiClient: Api) {
  return definePlugin(() => ({
    $api: apiClient as Api
  }))
}
