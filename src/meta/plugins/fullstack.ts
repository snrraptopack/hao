import type { MetaPlugin, PageContext } from '../runtime'
import type { Router } from '../../router'

// Lightweight cache wrapper around an existing $api client using router.state
function withRouterCache<Api extends Record<string, any>>(api: Api, router: Router<any>): Api {
  const cacheableMethods = new Set(['get'])
  return new Proxy(api, {
    get(target, prop: string) {
      const orig = (target as any)[prop]
      if (typeof orig !== 'function') return orig
      if (!cacheableMethods.has(prop)) return orig
      return async function (...args: any[]) {
        const key = `api:${String(prop)}:${JSON.stringify(args)}`
        if (router.state[key] !== undefined) return router.state[key]
        const res = await orig(...args)
        router.state[key] = res
        return res
      }
    }
  }) as Api
}

export function fullstackPlugin<Api extends Record<string, any>>(apiClient: Api): MetaPlugin<{ $api: Api }> {
  return {
    name: 'fullstack',
    onContextCreate(ctx: PageContext<{ $api: Api }>) {
      // Attach $api; wrap GETs with router-state cache for convenience
      const cached = withRouterCache(apiClient as any, ctx.router)
      ;(ctx as any).$api = cached
    },
  }
}