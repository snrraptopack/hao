import { ref, type Ref } from "./state";
import { onMount } from "./lifecycle";
import { createResource, type Resource } from './resource'

export type FetchState<T, P = void> = {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refetch: (param?: P) => Promise<void>;
}

/**
 * Simple data-fetching helper with `data`, `loading`, `error` refs and a `refetch()` function.
 * Automatically fetches on mount; optional `cacheKey` stores result in router state.
 * 
 * @param {string | () => string} url - URL to fetch from
 * @param {object} options - Optional configuration
 * @param {string} options.cacheKey - Key to cache data in router.state
 * @returns {FetchState<T>} Object with data, loading, error, and refetch
 * 
 * Example (JSX):
 * ```tsx
 * type User = { id: number; name: string }
 * const { data, loading, error } = fetch<User[]>('/api/users', { cacheKey: 'users' })
 * 
 * <When>
 *   {loading}
 *   {() => <div>Loading…</div>}
 *   {error}
 *   {() => <div>Error: {error.value}</div>}
 *   {() => <ul>{(data.value || []).map(u => <li>{u.name}</li>)}</ul>}
 * </When>
 * ```
 * 
 * Builder usage remains supported.
 */
export function fetch<T>(
  url: string | (() => string),
  options?: { cacheKey?: string }
): FetchState<T> {
  const key = options?.cacheKey ?? (typeof url === 'string' ? `fetch:${url}` : `fetch:${Date.now()}`)
  const resource: Resource<T> = createResource<T>(key, async (signal) => {
    const urlString = typeof url === 'function' ? url() : url
    const response = await window.fetch(urlString, { signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const result = await response.json()
    return result as T
  }, { scope: options?.cacheKey ? 'route' : 'global' })
  return {
    data: resource.data as Ref<T | null>,
    loading: resource.loading,
    error: resource.error,
    refetch: () => resource.refetch()
  }
}

/**
 * Async operation helper (does not auto-run on mount).
 * Useful for manual actions like form submissions.
 * 
 * @param {Function} fn - Async function to execute (optionally accepts a parameter)
 * @returns {FetchState<T, P>} Object with data, loading, error, and `refetch` as the execute function
 * 
 * Example (JSX):
 * ```tsx
 * // Without parameter
 * const { data, loading, error, refetch } = asyncOp(async () => {
 *   const res = await fetch('/api/submit', { method: 'POST' })
 *   return res.json()
 * })
 * 
 * // With parameter
 * const { data, loading, error, refetch } = asyncOp(async (searchTerm: string) => {
 *   return getImages(searchTerm)
 * })
 * 
 * <button onClick={() => refetch('cats')} disabled={loading.value}>Submit</button>
 * {error.value && <div>Error: {error.value}</div>}
 * ```
 * 
 * Builder usage remains supported.
 */
export function asyncOp<T, P = void>(
  fn: (param: P) => Promise<T>
): FetchState<T, P> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const execute = async (param?: P) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await fn(param as P)
      data.value = result
    } catch (e) {
      error.value = (e as Error).message
      console.error('Async operation error:', e)
    } finally {
      loading.value = false
    }
  }
  
  return { data, loading, error, refetch: execute }
}
