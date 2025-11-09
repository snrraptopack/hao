import { h } from '../jsx'
import { ref, watch, type Ref } from '../state'
import { onRouted } from '../lifecycle'
import { useRouter, useParams, useQuery, type RoutedContext } from '../router'
import { createMetaRuntime, type MetaPlugin, type PageContext } from './runtime'
import { type AppError, normalizeError } from '../resource'

export type PageDefinition<Ext = {}, Data = void> = {
  // Optional loader: runs on mount and when params/query change
  context?: (ctx: PageContext<Ext>) => Promise<Data> | Data
  // Render function: receives reactive refs for loading/data/error and the current context
  component: (
    ctx: PageContext<Ext>,
    refs: {
      data: Ref<Data | null>
      loading: Ref<boolean>
      error: Ref<AppError | null>
      // Trigger a reload of the page loader; force bypasses cache
      refetch: (force?: boolean) => Promise<void>
      // Invalidate the route-scoped cache to ensure next load fetches fresh data
      invalidate: () => void
    }
  ) => HTMLElement
  // Optional route meta to forward when constructing a Route externally
  meta?: Record<string, any>
  // Control when the loader re-runs automatically
  revalidateOn?: 'params' | 'query' | 'both' | 'none'
  // Optional TTL for route-scoped cache (milliseconds). If set, cached data expires after TTL.
  cacheTtl?: number
}

export function definePage<Ext = {}, Data = void>(def: PageDefinition<Ext, Data>, plugins: MetaPlugin<Ext>[] = []) {
  const runtime = createMetaRuntime<Ext>(plugins)

  // Router expects: (params?: RouteParams, query?: QueryParams) => HTMLElement
  return function PageComponent(): HTMLElement {
    const router = useRouter()
    const paramsRef = useParams()
    const queryRef = useQuery()

    const loading = ref(false)
    const error = ref<AppError | null>(null)
    const data = ref<Data | null>(null)

    let ctx: PageContext<Ext>
    // Initialize context immediately so it's defined before first render.
    // This avoids "used before being assigned" and provides a safe default
    // until onRouted() supplies the fully populated routed context.
    ctx = runtime.createContext({
      state: router.state,
      params: paramsRef.value,
      query: queryRef.value,
      prev: null,
      path: router.currentPath.value,
      router,
    } as RoutedContext)
    let isInitial = true
    let loadSeq = 0
    let currentController: AbortController | null = null

    const computeCacheKey = () => `meta:${router.currentPath.value}:data`

    async function runLoad(force?: boolean) {
      if (!def.context) return
      const seq = ++loadSeq
      // Abort previous request to avoid races
      if (currentController) {
        try { currentController.abort() } catch {}
      }
      currentController = new AbortController()
      ctx.signal = currentController.signal

      // Basic per-route cache using router.state; opt-in via force and TTL support
      const cacheKey = computeCacheKey()
      const cached = router.state[cacheKey]
      if (!force && cached !== undefined) {
        if (cached && typeof cached === 'object' && 'value' in (cached as any) && 'ts' in (cached as any)) {
          const entry = cached as { value: Data; ts: number }
          const ttl = def.cacheTtl ?? 0
          if (ttl <= 0 || (Date.now() - entry.ts) < ttl) {
            data.value = entry.value
            return
          }
        } else {
          // Legacy cache shape
          data.value = cached as Data
          return
        }
      }
      loading.value = true
      error.value = null
      try {
        await runtime.applyBeforeLoad(ctx)
        const result = await def.context(ctx)
        // Ignore stale results from previous loads
        if (seq !== loadSeq) return
        data.value = result as any
        // Write cache; include timestamp if TTL is configured
        if ((def.cacheTtl ?? 0) > 0) {
          router.state[cacheKey] = { value: result, ts: Date.now() }
        } else {
          router.state[cacheKey] = result
        }
        await runtime.applyAfterLoad(ctx, result, (e) => {
          error.value = normalizeError(e)
        })
      } catch (e) {
        // If aborted, prefer normalized abort error; also notify plugins
        const norm = normalizeError(e)
        error.value = norm
        try { await runtime.applyOnError(ctx, norm) } catch {}
      } finally {
        loading.value = false
      }
    }

    // Build initial context on mount with routed information
    onRouted((routed: RoutedContext) => {
      ctx = runtime.createContext(routed) as PageContext<Ext>
      if (def.context) {
        void runLoad(false)
      }
      // Keep context in sync with param/query changes and re-run loader
      const revalidateOn = def.revalidateOn ?? 'both'
      const runWatcher = (params: any, query: any) => {
        // Skip initial execution to prevent duplicate requests
        if (isInitial) {
          isInitial = false
          return
        }
        const match = router.getCurrentRoute()
        ctx = runtime.createContext({
          ...(ctx as any),
          params,
          query,
          path: router.currentPath.value,
          prev: match ?? null,
          router,
        } as RoutedContext)
        if (def.context) {
          void runLoad(true)
        }
      }

      if (revalidateOn === 'both') {
        watch([paramsRef, queryRef], ([params, query]) => runWatcher(params, query))
      } else if (revalidateOn === 'params') {
        watch(paramsRef, (params) => runWatcher(params, queryRef.value))
      } else if (revalidateOn === 'query') {
        watch(queryRef, (query) => runWatcher(paramsRef.value, query))
      } else {
        // 'none': keep context updated but don't auto-refetch
        watch([paramsRef, queryRef], ([params, query]) => {
          const match = router.getCurrentRoute()
          ctx = runtime.createContext({
            ...(ctx as any),
            params,
            query,
            path: router.currentPath.value,
            prev: match ?? null,
            router,
          } as RoutedContext)
        })
      }
    })

    // Render the wrapped page component with reactive refs
    const refetch = async (force?: boolean) => {
      await runLoad(!!force)
    }
    const invalidate = () => {
      const cacheKey = computeCacheKey()
      try { delete (router.state as any)[cacheKey] } catch {}
    }

    return def.component(ctx as any, { data, loading, error, refetch, invalidate })
  }
}