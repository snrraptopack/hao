import { h } from '../../../jsx'
import { watch, type Ref } from '../../../state'
import { When } from '../../../jsxutils'
import { useParams } from '../../../router'
import { getPost, type Post } from './api'

export function PostDetail(): HTMLElement {
  const params = useParams()
  const idRef: Ref<string> = watch(params, (p) => p.id) as Ref<string>

  const { data, loading, error } = getPost(idRef)
  const hasError: Ref<boolean> = watch(error, (e) => !!e) as Ref<boolean>
  
  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Post Detail</h2>
      <When>
        {loading}
        {() => <div class="text-gray-500">Loading post…</div>}
        {hasError}
        {() => <div class="text-red-600">Error: {error.value}</div>}
        {() => (
          <div class="p-3 rounded border bg-white">
            <div class="font-medium">{(data.value as any)?.title}</div>
            <div class="text-sm text-gray-600">User #{(data.value as any)?.userId}</div>
            <p class="mt-2 text-gray-700">{(data.value as any)?.body}</p>
          </div>
        )}
      </When>
    </div>
  )
}