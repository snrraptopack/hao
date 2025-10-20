// @page /component-composition
// Test case: Multiple components with different scoping rules

import { ref, type Ref } from 'auwla'

// Component helpers (shared across all components in this file)
const globalCounter: Ref<number> = ref(0)
const theme: Ref<'light' | 'dark'> = ref('light')

// Reusable component - logic inside is component logic (no lifecycle)
export function Counter({ initialValue = 0, globalCounter }: { 
  initialValue?: number
  globalCounter: Ref<number>
}) {
  // Component logic (not UI helpers, just component state)
  const count: Ref<number> = ref(initialValue)
  const increment = () => count.value++
  const decrement = () => count.value--
  
  return (
    <div className="p-4 border rounded">
      <h3>Counter Component</h3>
      <div className="flex gap-2 items-center">
        <button onClick={decrement}>-</button>
        <span>{count.value}</span>
        <button onClick={increment}>+</button>
      </div>
      <p>Global: {globalCounter.value}</p>
    </div>
  )
}

// Another reusable component
export function ThemeToggle({ theme }: { theme: Ref<'light' | 'dark'> }) {
  // Component logic
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  
  return (
    <button 
      onClick={toggleTheme}
      className={`px-4 py-2 rounded ${theme.value === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
    >
      {theme.value === 'light' ? '🌙' : '☀️'} Toggle Theme
    </button>
  )
}

// Page component (export default) - has lifecycle
export default function ComponentCompositionPage() {
  // UI helpers (scoped to this page's UI)
  const pageTitle: Ref<string> = ref('Component Composition Demo')
  const showCounters: Ref<boolean> = ref(true)
  
  const addGlobalCount = () => globalCounter.value++
  
  return (
    <div className={`min-h-screen p-8 ${theme.value === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{pageTitle.value}</h1>
        
        <div className="mb-6 flex gap-4 items-center">
          <ThemeToggle theme={theme} />
          <button 
            onClick={() => showCounters.value = !showCounters.value}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {showCounters.value ? 'Hide' : 'Show'} Counters
          </button>
          <button 
            onClick={addGlobalCount}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Global +1 ({globalCounter.value})
          </button>
        </div>
        
        {showCounters.value && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Counter initialValue={0} globalCounter={globalCounter} />
            <Counter initialValue={10} globalCounter={globalCounter} />
            <Counter initialValue={100} globalCounter={globalCounter} />
          </div>
        )}
      </div>
    </div>
  )
}