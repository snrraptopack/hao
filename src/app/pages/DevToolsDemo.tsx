import { h } from '../../jsx'
import { ref, watch } from '../../state'
import { onMount } from '../../lifecycle'
import { Link } from '../../router'

export function DevToolsDemo(): HTMLElement {
  const count = ref(0)
  const flag = ref(false)
  const doubled = watch(count, (c) => (c as number) * 2)
  const status = watch(flag, (f) => (f ? 'ON' : 'OFF'))

  // Background tick to demonstrate periodic watcher triggers
  const tick = ref(0)
  onMount(() => {
    const id = setInterval(() => { tick.value++ }, 250)
    return () => clearInterval(id)
  })

  // Orphaned refs demonstration (no watchers/components)
  const orphanCount = ref(0)
  function spawnOrphan() {
    const tmp = ref(Math.random())
    orphanCount.value += 1
    // Intentionally unused ref -> shows up as orphaned in DevTools overlay
    void tmp
  }

  return (
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">DevTools Demo</h2>
      <p class="text-gray-700">Open the floating DevTools button (or press Alt+D) and interact below to see live stats.</p>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="space-y-3 p-4 border rounded">
          <h3 class="font-semibold">Refs & Derived</h3>
          <div class="text-lg">Count: {count}</div>
          <div class="text-sm text-gray-600">Doubled (via watch): {doubled}</div>
          <div class="flex gap-2 pt-2">
            <button class="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => (count.value += 1)}>+1</button>
            <button class="px-3 py-1 border rounded" onClick={() => (count.value = 0)}>Reset</button>
          </div>
        </div>

        <div class="space-y-3 p-4 border rounded">
          <h3 class="font-semibold">Watchers & Side Effects</h3>
          <div class="text-sm">Flag: {status}</div>
          <div class="text-xs text-gray-500">Tick (background): {tick}</div>
          <div class="flex gap-2 pt-2">
            <button class="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => (flag.value = !flag.value)}>Toggle Flag</button>
          </div>
        </div>

        <div class="space-y-3 p-4 border rounded md:col-span-2">
          <h3 class="font-semibold">Orphaned Refs</h3>
          <p class="text-sm text-gray-600">Spawn refs without watchers/components to observe cleanup candidates in DevTools.</p>
          <div class="flex gap-2 pt-2">
            <button class="px-3 py-1 bg-amber-600 text-white rounded" onClick={spawnOrphan}>Spawn Orphan Ref</button>
            <span class="text-sm text-gray-700">Spawned: {orphanCount}</span>
          </div>
        </div>
      </div>

      <div class="pt-4">
        <Link to="/app/home" text="Back to Home" className="px-3 py-2 rounded border" activeClassName="bg-indigo-600 text-white" />
      </div>
    </div>
  ) as unknown as HTMLElement
}