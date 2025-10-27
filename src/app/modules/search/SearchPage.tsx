import { h } from '../../../jsx'
import { useQuery, useRouter } from '../../../router'
import { watch, type Ref } from '../../../state'
import { fetch } from '../../../fetch'
import { For, When } from '../../../jsxutils'
import { filterPostsByQuery, buildSearchPath } from '../posts/utils'
import { type Post } from '../posts/api'

export function SearchPage(): HTMLElement {
  const router = useRouter()
  const query = useQuery()
  const qRef: Ref<string> = watch(query, (q) => q.q || '') as Ref<string>
  const { data, loading, error, refetch } = fetch<Post[]>('https://jsonplaceholder.typicode.com/posts?_limit=50', { cacheKey: 'posts_search_base' })
  const posts: Ref<Post[]> = watch(data, (d) => Array.isArray(d) ? (d as Post[]) : []) as Ref<Post[]>
  const filtered: Ref<Post[]> = filterPostsByQuery(posts, qRef)
  const hasError: Ref<boolean> = watch(error, (e) => !!e) as Ref<boolean>

  const updateQuery = (value: string) => {
    router.replace(buildSearchPath(value))
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">Search Posts</h2>
        <input
          class="px-3 py-2 rounded border w-64"
          placeholder="Type to search…"
          value={qRef as any}
          onInput={(e: any) => updateQuery(e.target.value)}
        />
      </div>
      <When>
        {loading}
        {() => <div class="text-gray-500">Loading posts…</div>}
        {hasError}
        {() => <div class="text-red-600">Error: {error.value}</div>}
        {() => (
          <div class="space-y-3">
            <For each={filtered} render={(p) => (
              <div class="p-3 rounded border bg-white">
                <div class="font-medium">{p.title}</div>
                <p class="text-gray-700">{p.body.slice(0, 120)}…</p>
              </div>
            )} />
          </div>
        )}
      </When>
      <div>
        <button class="px-3 py-2 rounded border" onClick={() => refetch()}>Refetch Base</button>
      </div>
    </div>
  )
}