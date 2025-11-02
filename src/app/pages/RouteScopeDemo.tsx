import { h } from '../../jsx'
import { useRouter } from '../../router'
import { createResource } from '../../resource'
import { watch, type Ref } from '../../state'
import { For, When } from '../../jsxutils'
import { onMount, onRouted } from '../../lifecycle'

type Item = { id: number; title: string }

export function RouteScopeDemo(): HTMLElement {
  const router = useRouter()

  onRouted((ctx)=>{
    console.log("routed...big")
  })

  onMount(()=>{
    console.log("mounted....")
  })

  // Key includes route name to avoid collisions; scope 'route' writes-through to router.state
  const key = 'route-scope-demo:items'
  const { data, loading, error, stale, updatedAt, refetch } = createResource<Item[]>(
    key,
    async (signal) => {
      console.log("fetching..")
      const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=30', { signal })
      const json = await res.json()
      // Map to a simpler shape
      return (json as any[]).map((p) => ({ id: p.id, title: p.title }))
    },
    { scope: 'route', staleTime: 30000, revalidateOnFocus: true }
  )

  const items: Ref<Item[]> = watch(data, (d) => (Array.isArray(d) ? (d as Item[]) : [])) as Ref<Item[]>
  // Only show the loader for initial fetch; keep cached items visible during background revalidation
  const initialLoading: Ref<boolean> = watch([loading, items], ([l, arr]) => l && (arr?.length ?? 0) === 0) as Ref<boolean>
  const count: Ref<number> = watch(items, (arr) => arr.length) as Ref<number>
  const lastUpdated: Ref<string> = watch(updatedAt, (ts) => (ts ? new Date(ts).toLocaleTimeString() : '—')) as Ref<string>

  // Demonstrate programmatic prefetch: fills router.state[key] before navigation
  const doPrefetch = async () => {
    try {
        console.log(router.state)
      await router.prefetchNamed('route-scope-demo')
      // After prefetch, navigating here shows instant data (bootstrapped from router.state)
    } catch (e) {
      console.warn('Prefetch failed:', e)
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Route Scope Demo</h2>
        <div class="text-sm text-gray-600">Last updated: {lastUpdated as any} {watch(stale, (s) => (s ? '(stale)' : '')) as any}</div>
      </div>

      <div class="flex gap-2">
        <button class="px-3 py-2 rounded border" onClick={() => doPrefetch()}>Prefetch (fills router.state)</button>
        <button class="px-3 py-2 rounded border" onClick={() => refetch()}>Refetch</button>
      </div>

      <div class="text-gray-700">Count: {count as any}</div>

      <When>
        {initialLoading}
        {() => <div class="text-gray-500">Loading…</div>}
        {watch(error, (e) => !!e) as Ref<boolean>}
        {() => <div class="text-red-600">Error: {error.value ?? "Unknown error"}</div>}
        {() => (
          <div class="space-y-2">
            <For each={items} render={(it) => (
              <div class="p-3 rounded border bg-white">
                <div class="font-medium">#{it.id} — {it.title}</div>
              </div>
            )} />
          </div>
        )}
      </When>
    </div>
  )
}