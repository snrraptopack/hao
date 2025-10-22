#!/usr/bin/env bun

/**
 * Test Scope Analyzer functionality
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { ScopeAnalyzer } from './src/core/scope-analyzer.js'

console.log('🧪 Testing Scope Analyzer...')
console.log('=' .repeat(50))

const tests = [
  {
    name: 'Page component scoping (inverted)',
    input: `
//@page /test
const globalVar = ref(0)
function globalFn() { return 1 }

export default function TestPage() {
  const localVar = "hello"
  function localFn() { return 2 }
  return <div>{localVar}</div>
}
`,
    expected: {
      componentScope: 2, // globalVar, globalFn go to component scope
      uiScope: 2        // localVar, localFn go to UI scope
    }
  },
  {
    name: 'Regular component scoping (normal)',
    input: `
const globalVar = ref(0)
function globalFn() { return 1 }

export default function RegularComponent() {
  const localVar = "hello"
  function localFn() { return 2 }
  return <div>{localVar}</div>
}
`,
    expected: {
      componentScope: 2, // globalVar, globalFn stay in component scope
      uiScope: 2        // localVar, localFn stay in UI scope
    }
  },
  {
    name: 'Dependency ordering',
    input: `
//@page /deps
const b = a + 1
const a = ref(0)
const c = b * 2

export default function DepsPage() {
  const y = x + 1
  const x = "test"
  const z = y + x
  return <div>{z}</div>
}
`,
    expected: {
      componentScope: 3, // a, b, c (should be reordered: a, b, c)
      uiScope: 3        // x, y, z (should be reordered: x, y, z)
    }
  }
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    console.log(`\n📝 Testing: ${test.name}`)
    
    const parsed = parseTSX(test.input, `${test.name}.tsx`)
    const analyzer = new ScopeAnalyzer()
    const scoped = analyzer.analyze(parsed, `${test.name}.tsx`)
    
    // Check expectations
    let testPassed = true
    const errors: string[] = []
    
    if (scoped.componentScope.length !== test.expected.componentScope) {
      errors.push(`Expected ${test.expected.componentScope} component scope blocks, got ${scoped.componentScope.length}`)
      testPassed = false
    }
    
    if (scoped.uiScope.length !== test.expected.uiScope) {
      errors.push(`Expected ${test.expected.uiScope} UI scope blocks, got ${scoped.uiScope.length}`)
      testPassed = false
    }
    
    if (testPassed) {
      console.log('   ✅ PASSED')
      console.log(`      Component scope: ${scoped.componentScope.length} blocks`)
      scoped.componentScope.forEach((block, i) => {
        const symbol = block.code.match(/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1] || 'unknown'
        console.log(`        ${i + 1}. ${symbol}: ${block.code.substring(0, 30)}...`)
      })
      console.log(`      UI scope: ${scoped.uiScope.length} blocks`)
      scoped.uiScope.forEach((block, i) => {
        const symbol = block.code.match(/(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/)?.[1] || 'unknown'
        console.log(`        ${i + 1}. ${symbol}: ${block.code.substring(0, 30)}...`)
      })
      passed++
    } else {
      console.log('   ❌ FAILED')
      errors.forEach(error => console.log(`      - ${error}`))
      
      // Show actual results for debugging
      console.log(`      Actual component scope: ${scoped.componentScope.length}`)
      scoped.componentScope.forEach((block, i) => {
        console.log(`        ${i + 1}. ${block.code.substring(0, 50)}...`)
      })
      console.log(`      Actual UI scope: ${scoped.uiScope.length}`)
      scoped.uiScope.forEach((block, i) => {
        console.log(`        ${i + 1}. ${block.code.substring(0, 50)}...`)
      })
      
      failed++
    }
    
  } catch (error) {
    console.log('   ❌ ERROR:', error)
    failed++
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}