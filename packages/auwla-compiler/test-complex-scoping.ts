#!/usr/bin/env bun

/**
 * Test complex scoping scenarios
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { ScopeAnalyzer } from './src/core/scope-analyzer.js'

console.log('🧪 Testing Complex Scoping Scenarios...')

const complexInput = `
//@page /complex-scoping
import { ref, computed, watch } from "auwla"

// These should go to component scope (page function)
const sharedCount = ref(0)
const API_BASE = "https://api.example.com"
const utils = {
  formatNumber: (n) => n.toLocaleString(),
  debounce: (fn, delay) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => fn(...args), delay)
    }
  }
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.value, 0)
}

export default function ComplexPage() {
  // These should go to UI scope (Component callback)
  const localData = ref([])
  const searchTerm = ref("")
  const isLoading = ref(false)
  
  const filteredData = computed(() => 
    localData.value.filter(item => 
      item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  )
  
  const total = computed(() => calculateTotal(filteredData.value))
  
  const debouncedSearch = utils.debounce((term) => {
    searchTerm.value = term
  }, 300)
  
  async function fetchData() {
    isLoading.value = true
    try {
      const response = await fetch(\`\${API_BASE}/data\`)
      localData.value = await response.json()
    } finally {
      isLoading.value = false
    }
  }
  
  return (
    <div>
      <h1>Complex Scoping Test</h1>
      <p>Shared count: {sharedCount.value}</p>
      <p>Total: {utils.formatNumber(total.value)}</p>
      <input 
        value={searchTerm.value}
        onChange={(e) => debouncedSearch(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={fetchData}>
        {isLoading.value ? "Loading..." : "Fetch Data"}
      </button>
      <div>
        {filteredData.value.map(item => (
          <div key={item.id}>{item.name}: {item.value}</div>
        ))}
      </div>
    </div>
  )
}
`

try {
  console.log('📊 ANALYZING COMPLEX SCOPING...')
  
  const parsed = parseTSX(complexInput, 'complex-scoping.tsx')
  const analyzer = new ScopeAnalyzer()
  const scoped = analyzer.analyze(parsed, 'complex-scoping.tsx')
  
  console.log(`\n🔍 RESULTS:`)
  console.log(`Metadata: isPage=${scoped.metadata.isPage}, route=${scoped.metadata.route}`)
  
  console.log(`\n📦 Component Scope (${scoped.componentScope.length} blocks):`)
  scoped.componentScope.forEach((block, i) => {
    const symbol = block.code.match(/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1] || 'expression'
    console.log(`  ${i + 1}. ${symbol}: ${block.code.substring(0, 60)}...`)
    if (block.dependencies.length > 0) {
      console.log(`     Dependencies: [${block.dependencies.join(', ')}]`)
    }
  })
  
  console.log(`\n🎨 UI Scope (${scoped.uiScope.length} blocks):`)
  scoped.uiScope.forEach((block, i) => {
    const symbol = block.code.match(/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1] || 'expression'
    console.log(`  ${i + 1}. ${symbol}: ${block.code.substring(0, 60)}...`)
    if (block.dependencies.length > 0) {
      console.log(`     Dependencies: [${block.dependencies.join(', ')}]`)
    }
  })
  
  // Validate scoping rules
  console.log(`\n✅ VALIDATION:`)
  
  const expectedComponentSymbols = ['sharedCount', 'API_BASE', 'utils', 'calculateTotal']
  const expectedUISymbols = ['localData', 'searchTerm', 'isLoading', 'filteredData', 'total', 'debouncedSearch', 'fetchData']
  
  const actualComponentSymbols = scoped.componentScope.map(block => 
    block.code.match(/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1]
  ).filter(Boolean)
  
  const actualUISymbols = scoped.uiScope.map(block => 
    block.code.match(/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1]
  ).filter(Boolean)
  
  console.log(`Component scope symbols: [${actualComponentSymbols.join(', ')}]`)
  console.log(`Expected: [${expectedComponentSymbols.join(', ')}]`)
  console.log(`Component scope correct: ${expectedComponentSymbols.every(sym => actualComponentSymbols.includes(sym)) ? '✅' : '❌'}`)
  
  console.log(`UI scope symbols: [${actualUISymbols.join(', ')}]`)
  console.log(`Expected: [${expectedUISymbols.join(', ')}]`)
  console.log(`UI scope correct: ${expectedUISymbols.every(sym => actualUISymbols.includes(sym)) ? '✅' : '❌'}`)
  
  console.log(`\n🎯 SCOPING ANALYSIS COMPLETE!`)
  
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}