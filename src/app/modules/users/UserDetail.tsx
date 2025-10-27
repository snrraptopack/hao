import { h } from '../../../jsx'
import { Link, useParams } from '../../../router'
import { watch, type Ref } from '../../../state'
import { When } from '../../../jsxutils'
import { getUser, type User } from './api'
import { lastViewedUserId } from './state'

export function UserDetail(): HTMLElement {
  const params = useParams()
  const idRef: Ref<string> = watch(params, (p) => p.id) as Ref<string>
  const { data, loading, error } = getUser(idRef)

  const hasError: Ref<boolean> = watch(error, (e) => !!e) as Ref<boolean>
  // Externalize state instead of relying on router lifecycle hook
  watch(idRef, (id) => { lastViewedUserId.value = id })

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold">User Detail</h2>
        <Link to="/app/users" text="Back" className="px-2 py-1 rounded border" activeClassName="bg-indigo-600 text-white" />
      </div>
      <When>
        {loading}
        {() => <div class="text-gray-500">Loading user…</div>}
        {hasError}
        {() => <div class="text-red-600">Error: {error.value}</div>}
        {() => (
          <div class="p-3 rounded border bg-white">
            <div class="font-medium">{(data.value as any)?.name}</div>
            <div class="text-sm text-gray-600">@{(data.value as any)?.username} • {(data.value as any)?.email}</div>
            <div class="mt-2 flex gap-2">
              <Link to="/app/posts" query={{ userId: idRef.value }} text="View Posts" className="px-2 py-1 rounded border" activeClassName="bg-indigo-600 text-white" />
            </div>
          </div>
        )}
      </When>
    </div>
  )
}