# 003 – createResource (Keyed data resources with dedup, abort, and SWR)

Status: Implemented, awaiting review

Overview
- createResource<T>(key, fetcher, options) provides a robust data layer with keyed caches, deduplication, AbortController-based cancellation, and stale-while-revalidate (SWR) semantics.
- Returns shared refs across calls with the same key: { data, error, loading, stale, updatedAt, refetch }.
- Complements the simple fetch<T>() helper, which now delegates to createResource internally while keeping its API unchanged.

API
```ts
type Resource<T> = {
  data: Ref<T | null>
  error: Ref<string | null>
  loading: Ref<boolean>
  stale: Ref<boolean>
  updatedAt: Ref<number | null>
  refetch: (opts?: { force?: boolean }) => Promise<void>
}

function createResource<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options?: {
    staleTime?: number
    revalidateOnFocus?: boolean
    scope?: 'global' | 'route'
    parse?: (raw: unknown) => T
  }
): Resource<T>
```

Behavior and Guarantees
- Shared state: Multiple createResource calls with the same key return the same underlying refs (dedup).
- Dedup: Concurrent refetches reuse the in-flight request unless forced via refetch({ force: true }).
- Abort: In-flight requests are cancelled when a new request supersedes them or when the owning component unmounts.
- SWR: After staleTime, stale flips true and a background revalidation begins; data remains visible until updated.
- Focus revalidation: When revalidateOnFocus is true, a window focus triggers revalidation if the resource is stale.
- Router integration (optional): scope: 'route' writes-through results to router.state[key] and bootstraps from it if available.
- Scheduling: All ref updates coalesce via the global scheduler; downstream subscribers are batched.

Usage Examples
```ts
// Users list with SWR and focus revalidation
type User = { id: number; name: string }
const users = createResource<User[]>(
  'users',
  async (signal) => {
    const res = await fetch('/api/users', { signal })
    return await res.json()
  },
  { staleTime: 30_000, revalidateOnFocus: true }
)

// JSX
<When>
  {users.loading}
  {() => <div>Loading…</div>}
  {users.error}
  {() => <div>Error: {users.error.value}</div>}
  {() => <ul>{(users.data.value || []).map(u => <li>{u.name}</li>)}</ul>}
</When>
```

Best Practices
- Use stable keys per resource (e.g., 'users', 'post:42'). Keys determine shared caches and dedup behavior.
- Always forward the AbortSignal to your underlying fetcher (e.g., window.fetch) to enable cancellation.
- Prefer SWR for frequently viewed lists; set staleTime to balance freshness and network load.
- Use parse to validate/shape data before writing to refs.

Interoperability
- fetch<T>() now delegates to createResource with a key derived from cacheKey or URL; its API remains unchanged.
- Resources expose refs compatible with watch/derive and JSX binding.
- Router cache is readable and writable via router.state when scope: 'route' is set.

Testing
- See tests/resource.test.ts for shared refs/dedup, abort-on-unmount, and SWR behavior.

Open Questions for Review
- Do we want additional options like retry/backoff and revalidateOnVisibilityChange beyond focus?
- Should createResource support dynamic keys (e.g., reactive params) via a small wrapper helper?