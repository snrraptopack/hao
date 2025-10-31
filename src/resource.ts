import { ref, type Ref } from './state'
import { onMount } from './lifecycle'
import { isDevEnv } from './devtools'
import { getWatchContext } from './state'

export type Resource<T> = {
  data: Ref<T | null>
  error: Ref<string | null>
  loading: Ref<boolean>
  stale: Ref<boolean>
  updatedAt: Ref<number | null>
  refetch: (opts?: { force?: boolean }) => Promise<void>
}

export type ResourceOptions<T> = {
  staleTime?: number
  revalidateOnFocus?: boolean
  scope?: 'global' | 'route'
  parse?: (raw: unknown) => T
}

type Entry = {
  data: Ref<any>
  error: Ref<string | null>
  loading: Ref<boolean>
  stale: Ref<boolean>
  updatedAt: Ref<number | null>
  controller: AbortController | null
  inFlight: Promise<any> | null
  timer: any
  focusListener: ((this: Window, ev: Event) => any) | null
  fetcher: (signal: AbortSignal) => Promise<any>
  options: ResourceOptions<any>
}

const cache = new Map<string, Entry>()

function getOrInitEntry<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>, options?: ResourceOptions<T>): Entry {
  let existing = cache.get(key)
  if (existing) {
    // Update fetcher/options, keep refs shared
    existing.fetcher = fetcher as any
    existing.options = { ...(existing.options || {}), ...(options || {}) }
    return existing
  }

  const entry: Entry = {
    data: ref<any>(null),
    error: ref<string | null>(null),
    loading: ref<boolean>(false),
    stale: ref<boolean>(false),
    updatedAt: ref<number | null>(null),
    controller: null,
    inFlight: null,
    timer: null,
    focusListener: null,
    fetcher: fetcher as any,
    options: options || {}
  }

  // Optional router-state bootstrap
  try {
    const { getRouter } = require('./router')
    const router = getRouter()
    const cached = router?.state?.[key]
    if (cached !== undefined) {
      entry.data.value = cached
      entry.stale.value = false
      entry.updatedAt.value = Date.now()
    }
  } catch {}

  cache.set(key, entry)
  return entry
}

export function createResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options?: ResourceOptions<T>
): Resource<T> {
  const entry = getOrInitEntry<T>(key, fetcher, options)

  const start = async (force = false) => {
    // Dedup: reuse in-flight unless forced
    if (entry.inFlight && !force) {
      try { await entry.inFlight } catch {}
      return
    }

    // Abort any previous request
    if (entry.controller) {
      try { entry.controller.abort() } catch {}
    }
    entry.controller = new AbortController()
    const signal = entry.controller.signal

    entry.loading.value = true
    entry.error.value = null

    const promise = (async () => {
      try {
        const raw = await entry.fetcher(signal)
        const parsed = entry.options.parse ? (entry.options.parse(raw) as T) : (raw as T)
        entry.data.value = parsed
        entry.updatedAt.value = Date.now()
        entry.stale.value = false

        // Write-through to router.state when scoped to route
        if (entry.options.scope === 'route') {
          try {
            const { getRouter } = require('./router')
            const router = getRouter()
            if (router) router.state[key] = parsed
          } catch {}
        }

        // SWR: schedule stale and background revalidate
        if (entry.timer) {
          try { clearTimeout(entry.timer) } catch {}
          entry.timer = null
        }
        const staleTime = entry.options.staleTime ?? 0
        if (staleTime > 0) {
          entry.timer = setTimeout(() => {
            entry.stale.value = true
            // Start a background revalidation if not already in flight
            void start(true)
          }, staleTime)
        }
      } catch (e: any) {
        if (signal.aborted) {
          if (isDevEnv()) console.log(`[resource:${key}] aborted`)
        } else {
          entry.error.value = String(e?.message ?? e)
        }
      } finally {
        entry.loading.value = false
        entry.inFlight = null
      }
    })()
    entry.inFlight = promise
    try { await promise } catch {}
  }

  const refetch = async (opts?: { force?: boolean }) => start(!!opts?.force)

  // Focus revalidate if configured
  if (!entry.focusListener && entry.options.revalidateOnFocus) {
    const handler = () => {
      if (entry.stale.value) void start(true)
    }
    window.addEventListener('focus', handler)
    entry.focusListener = handler
    // Auto-cleanup in component context
    const ctx = getWatchContext()
    if (ctx) {
      ctx.add(() => {
        window.removeEventListener('focus', handler)
        entry.focusListener = null
      })
    }
  }

  // Auto-fetch on mount for convenience (mirrors fetch<T> helper behavior)
  onMount(() => { void start(false) })

  // Abort on unmount and clear timers/listeners
  const ctx = getWatchContext()
  if (ctx) {
    ctx.add(() => {
      try { if (entry.controller) entry.controller.abort() } catch {}
      try { if (entry.timer) clearTimeout(entry.timer) } catch {}
      entry.timer = null
      if (entry.focusListener) {
        window.removeEventListener('focus', entry.focusListener)
        entry.focusListener = null
      }
    })
  }

  return {
    data: entry.data as Ref<T | null>,
    error: entry.error,
    loading: entry.loading,
    stale: entry.stale,
    updatedAt: entry.updatedAt,
    refetch
  }
}