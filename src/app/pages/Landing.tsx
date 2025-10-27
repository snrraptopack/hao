import { h } from '../../jsx'
import { Link } from '../../router'

export function LandingPage(): HTMLElement {
  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="p-8 bg-white rounded-xl shadow-sm space-y-4 text-center">
        <h1 class="text-3xl font-bold">Auwla Demo</h1>
        <p class="text-gray-600">Start the modular app experience.</p>
        <div class="flex justify-center">
          <Link to="/app/home" text="Enter App" className="px-4 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
        </div>
      </div>
    </div>
  )
}