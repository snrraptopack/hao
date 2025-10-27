import { h } from '../../../jsx'
import { watch } from '../../../state'
import { isAuthed, login, logout } from '../../state/auth'

export function AdminPage(): HTMLElement {
  const status = watch(isAuthed, () => (isAuthed.value ? 'Authenticated' : 'Guest'))
  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Admin Dashboard</h2>
      <p class="text-gray-700">Status: {status as any}</p>
      <div class="flex gap-2">
        <button class="px-3 py-2 rounded border" onClick={() => login()}>Login</button>
        <button class="px-3 py-2 rounded border" onClick={() => logout()}>Logout</button>
      </div>
      <p class="text-gray-600">Use the header toggle or these buttons to change auth state.</p>
    </div>
  )
}