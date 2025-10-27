import { h } from '../../../jsx'
import { Link } from '../../../router'
import { watch, type Ref } from '../../../state'
import { For, When } from '../../../jsxutils'
import { listUsers, type User } from './api'

export function UsersList(): HTMLElement {
  const { data, loading, error, refetch } = listUsers()

  const users: Ref<User[]> = watch(data, (d) => Array.isArray(d) ? (d as User[]) : []) as Ref<User[]>
  const hasError: Ref<boolean> = watch(error, (e) => !!e) as Ref<boolean>

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Users</h2>
        <button class="px-3 py-2 rounded border" onClick={() => refetch()}>Refetch</button>
      </div>
      <When>
        {loading}
        {() => <div class="text-gray-500">Loading users…</div>}
        {hasError}
        {() => <div class="text-red-600">Error: {error.value}</div>}
        {() => (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <For each={users} render={(u) => (
              <div class="p-3 rounded border bg-white">
                <div class="font-medium">{u.name}</div>
                <div class="text-sm text-gray-600">@{u.username} • {u.email}</div>
                <div class="mt-2">
                  <Link to="/app/users/:id" params={{ id: u.id }} text="View" className="px-2 py-1 rounded border" activeClassName="bg-indigo-600 text-white" />
                </div>
              </div>
            )} />
          </div>
        )}
      </When>
    </div>
  )
}