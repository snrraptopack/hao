import type { MetaPlugin, LoaderContext } from '../runtime'

/**
 * Fullstack plugin that injects a type-safe API client into the loader context.
 * 
 * This plugin demonstrates how to extend the loader context with custom properties.
 * For caching, use `createResource` from core Auwla instead of built-in caching.
 * 
 * @example
 * ```typescript
 * const page = definePage({
 *   loader: ({ $api, params }) => {
 *     // Use createResource for caching
 *     const user = createResource(
 *       `user-${params.id}`,
 *       (signal) => $api.getUser({ id: params.id })
 *     )
 *     return { user }
 *   },
 *   component: (ctx, { user }) => (
 *     <div>{user.data.value?.name}</div>
 *   )
 * }, [fullstackPlugin($api)])
 * ```
 */
export function fullstackPlugin<Api extends Record<string, any>>(apiClient: Api): MetaPlugin<{ $api: Api }> {
  return {
    name: 'fullstack',
    onContextCreate(ctx: LoaderContext<{ $api: Api }>) {
      // Attach $api directly to context (no caching - use createResource instead)
      ;(ctx as any).$api = apiClient
    },
  }
}