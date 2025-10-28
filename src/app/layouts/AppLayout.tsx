import { h } from '../../jsx'
import { Link } from '../../router'
import { watch } from '../../state'
import { isAuthed, toggleAuth } from '../state/auth'

// Layout wrapper used via Route.layout; receives the child page element
export function AppLayout(child: HTMLElement): HTMLElement {
  const authedText = watch(isAuthed, () => (isAuthed.value ? 'Logout' : 'Login'))
  const authedLabel = watch(isAuthed, () => (isAuthed.value ? 'Authenticated' : 'Guest'))
  return (
    <div class="min-h-screen bg-gray-50 text-gray-900">
      <header class="bg-white border-b">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="font-bold text-lg">Auwla Modular App</h1>
            <span class="text-xs px-2 py-1 rounded bg-gray-100 border">{authedLabel as any}</span>
          </div>
          <nav class="flex gap-2">
            <Link to="/app/home" text="Home" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
            <Link to="/app/users" text="Users" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
            <Link to="/app/posts" text="Posts" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
            <Link to="/app/search" text="Search" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
            <Link to="/app/devtools" text="DevTools" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
            <Link to="/admin/dashboard" text="Admin" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
          </nav>
          <button class="px-3 py-2 rounded border" onClick={() => toggleAuth()}>{authedText as any}</button>
        </div>
      </header>
      <main class="max-w-5xl mx-auto px-4 py-6">
        {child}
      </main>
    </div>
  )
}