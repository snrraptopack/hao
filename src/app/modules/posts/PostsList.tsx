import { h } from '../../../jsx'
import { Link, useQuery } from '../../../router'
import { watch, type Ref } from '../../../state'
import { For, When } from '../../../jsxutils'
import { listPosts, type Post } from './api'

export function PostsList(): HTMLElement {
  const query = useQuery()
  const userIdRef: Ref<string | undefined> = watch(query, (q) => q.userId) as Ref<string | undefined>
  const { data, loading, error, refetch } = listPosts(userIdRef)

  // Auto-refetch when query changes (e.g., userId)
  watch(query, () => refetch())

  const posts: Ref<Post[]> = watch(data, (d) => Array.isArray(d) ? (d as Post[]) : []) as Ref<Post[]>
  const hasError: Ref<boolean> = watch(error, (e) => !!e) as Ref<boolean>

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Posts</h2>
        <button class="px-3 py-2 rounded border" onClick={() => refetch()}>Refetch</button>
      </div>
      <When>
        {loading}
        {() => <div class="text-gray-500">Loading posts…</div>}
        {hasError}
        {() => <div class="text-red-600">Error: {error.value}</div>}
        {() => (
          <div class="space-y-3">
            <For each={posts} render={(p) => (
              <div class="p-3 rounded border bg-white">
                <div class="font-medium">{p.title}</div>
                <div class="text-sm text-gray-600">by User #{p.userId}</div>
                <div class="mt-2 flex gap-2">
                  <Link to="/app/users/:id" params={{ id: p.userId }} text="User" className="px-2 py-1 rounded border" activeClassName="bg-indigo-600 text-white" />
                </div>
              </div>
            )} />
          </div>
        )}
      </When>
    </div>
  )
}