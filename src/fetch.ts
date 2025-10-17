import { ref, type Ref } from "./state";
import { onMount } from "./lifecycle";

export type FetchState<T> = {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refetch: () => Promise<void>;
}

/**
 * Simple fetch helper with loading/error states.
 * Automatically fetches when component mounts.
 * 
 * @param {string | () => string} url - URL to fetch from
 * @param {object} options - Optional configuration
 * @param {string} options.cacheKey - Key to cache data in router.state
 * @returns {FetchState<T>} Object with data, loading, error, and refetch
 * 
 * @example
 * ```typescript
 * type User = { id: number; name: string }
 * 
 * const App = Component((ui) => {
 *   // With caching
 *   const { data, loading, error } = fetch<User[]>('/api/users', {
 *     cacheKey: 'users'
 *   })
 *   
 *   ui.When(loading, (ui) => {
 *     ui.Text({ value: "Loading..." })
 *   })
 *   
 *   ui.When(watch(data, d => d !== null), (ui) => {
 *     ui.List({
 *       items: data,
 *       key: (user) => user.id,
 *       render: (user, i, ui) => {
 *         ui.Text({ value: user.name })
 *       }
 *     })
 *   })
 * })
 * ```
 */
export function fetch<T>(
  url: string | (() => string),
  options?: { cacheKey?: string }
): FetchState<T> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const fetchData = async () => {
    // Check cache first if cacheKey is provided
    if (options?.cacheKey) {
      try {
        const { getRouter } = await import("./router")
        const router = getRouter()
        
        if (router.state[options.cacheKey]) {
          console.log(`✅ Using cached data for: ${options.cacheKey}`)
          data.value = router.state[options.cacheKey]
          return
        }
      } catch (e) {
        // Router not available, proceed with fetch
      }
    }
    
    loading.value = true
    error.value = null
    
    try {
      const urlString = typeof url === 'function' ? url() : url
      const response = await window.fetch(urlString)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      data.value = result
      
      // Cache the result if cacheKey is provided
      if (options?.cacheKey) {
        try {
          const { getRouter } = await import("./router")
          const router = getRouter()
          router.state[options.cacheKey] = result
          console.log(`💾 Cached data for: ${options.cacheKey}`)
        } catch (e) {
          // Router not available, skip caching
        }
      }
    } catch (e) {
      error.value = (e as Error).message
      console.error('Fetch error:', e)
    } finally {
      loading.value = false
    }
  }
  
  // Auto-fetch on component mount
  onMount(() => {
    fetchData()
  })
  
  return { data, loading, error, refetch: fetchData }
}

/**
 * Async operation helper (doesn't auto-fetch on mount).
 * Use this for manual operations like form submissions.
 * 
 * @param {Function} fn - Async function to execute
 * @returns {FetchState<T>} Object with data, loading, error, and execute function
 * 
 * @example
 * ```typescript
 * const App = Component((ui) => {
 *   const { data, loading, execute } = asyncOp(async () => {
 *     const res = await fetch('/api/submit', { method: 'POST' })
 *     return res.json()
 *   })
 *   
 *   ui.Button({
 *     text: "Submit",
 *     on: { click: () => execute() }
 *   })
 * })
 * ```
 */
export function asyncOp<T>(fn: () => Promise<T>): FetchState<T> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const execute = async () => {
    loading.value = true
    error.value = null
    
    try {
      const result = await fn()
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
