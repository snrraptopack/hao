import { ref, watch } from './state'
import { enableDevToolsOverlay } from './index'

// Force-enable DevTools instrumentation for predictable testing
if (typeof window !== 'undefined') {
  ;(window as any).__AUWLA_DEVTOOLS_FORCE_DEV__ = true
}

// Floating overlay for live stats and dependency inspection
enableDevToolsOverlay({ hotkey: 'Alt+D', position: 'bottom-right', defaultOpen: true })

function CounterDemo() {
  const count = ref(0)
  const doubled = watch(count, (v: number) => v * 2)

  const a = ref(0)
  const b = ref(0)
  // Side-effect watcher to exercise watcher events
  const lastUpdate = ref(Date.now())
  watch(count, () => { lastUpdate.value = Date.now() })

  return (
    <div class="p-6 space-y-4">
      <h1 class="text-2xl font-bold">DevTools Simple Counter</h1>
      <p class="text-sm text-gray-600">Open the overlay (Alt+D) and interact below to see live stats.</p>
      <div class="space-y-2">
        <div class="text-lg">Count: {count}</div>
        <div class="text-sm text-gray-700">Doubled: {doubled}</div>
        <div class="text-xs text-gray-500">Last update: {ref(new Date(lastUpdate.value).toLocaleTimeString())}</div>
      </div>
      <div class="flex gap-2 pt-2">
        <button class="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => (count.value += 1)}>+1</button>
        <button class="px-3 py-1 border rounded" onClick={() => (count.value = 0)}>Reset</button>

        <div class="text-lg">A: {a}</div>
        <div class="text-lg">B: {b}</div>
        <button class="px-3 py-1 border rounded" onClick={() => (a.value += 1)}>A+1</button>
        <button class="px-3 py-1 border rounded" onClick={() => (b.value += 1)}>B+1</button>
      </div>
    </div>
  )
}

const mount = document.getElementById('app')
if (mount) {
  mount.innerHTML = ''
  mount.appendChild(<CounterDemo /> as unknown as Node)
}