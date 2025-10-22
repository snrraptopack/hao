#!/usr/bin/env bun

/**
 * Test TSX Parser functionality
 */

import { parseTSX } from './src/core/tsx-parser.js'

console.log('🧪 Testing TSX Parser...')
console.log('=' .repeat(50))

const tests = [
  {
    name: 'Page component with metadata',
    input: `
//@page /test-page
//@title Test Page
//@description A test page for validation
import { ref, computed } from "auwla"

const globalCount = ref(0)
const globalMessage = "Hello"

export default function TestPage() {
  const localVar = "local"
  const localCount = ref(1)
  
  return (
    <div className="container">
      <h1>{globalMessage}</h1>
      <p>Count: {globalCount.value}</p>
      <button onClick={() => globalCount.value++}>
        Increment
      </button>
    </div>
  )
}
`,
    expected: {
      isPage: true,
      route: '/test-page',
      title: 'Test Page',
      description: 'A test page for validation',
      imports: 1,
      components: 1,
      topLevelCode: 2 // globalCount and globalMessage
    }
  },
  {
    name: 'Regular component without metadata',
    input: `
import React from "react"

const helper = () => "helper"

export default function RegularComponent({ name }) {
  const greeting = \`Hello, \${name}!\`
  
  return (
    <div>
      <span>{greeting}</span>
      <span>{helper()}</span>
    </div>
  )
}
`,
    expected: {
      isPage: false,
      imports: 1,
      components: 1,
      topLevelCode: 1 // helper function
    }
  },
  {
    name: 'Complex component with multiple patterns',
    input: `
//@page /complex
import { ref, watch, computed } from "auwla"
import { utils } from "./utils"

// Top-level variables
const sharedState = ref({ count: 0, name: "Test" })
const API_URL = "https://api.example.com"

// Top-level function
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

export default function ComplexPage() {
  // Component body variables
  const localData = ref([])
  const isLoading = ref(false)
  
  // Component body function
  const fetchData = async () => {
    isLoading.value = true
    // fetch logic here
    isLoading.value = false
  }
  
  // Computed value
  const total = computed(() => calculateTotal(localData.value))
  
  return (
    <div className={isLoading.value ? "loading" : "loaded"}>
      <h1>Complex Page</h1>
      <p>Shared count: {sharedState.value.count}</p>
      <p>Total: {total.value}</p>
      
      {localData.value.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <span>\${item.price}</span>
        </div>
      ))}
      
      <button onClick={fetchData}>
        {isLoading.value ? "Loading..." : "Fetch Data"}
      </button>
    </div>
  )
}
`,
    expected: {
      isPage: true,
      route: '/complex',
      imports: 2,
      components: 1,
      topLevelCode: 3 // sharedState, API_URL, calculateTotal
    }
  }
]

let passed = 0
let failed = 0

for (const test of tests) {
  try {
    console.log(`\n📝 Testing: ${test.name}`)
    
    const result = parseTSX(test.input, `${test.name}.tsx`)
    
    // Check expectations
    let testPassed = true
    const errors: string[] = []
    
    // Check metadata
    if (test.expected.isPage !== undefined) {
      if (result.metadata.isPage !== test.expected.isPage) {
        errors.push(`Expected isPage: ${test.expected.isPage}, got ${result.metadata.isPage}`)
        testPassed = false
      }
    }
    
    if (test.expected.route !== undefined) {
      if (result.metadata.route !== test.expected.route) {
        errors.push(`Expected route: ${test.expected.route}, got ${result.metadata.route}`)
        testPassed = false
      }
    }
    
    if (test.expected.title !== undefined) {
      if (result.metadata.title !== test.expected.title) {
        errors.push(`Expected title: ${test.expected.title}, got ${result.metadata.title}`)
        testPassed = false
      }
    }
    
    if (test.expected.description !== undefined) {
      if (result.metadata.description !== test.expected.description) {
        errors.push(`Expected description: ${test.expected.description}, got ${result.metadata.description}`)
        testPassed = false
      }
    }
    
    // Check structure
    if (test.expected.imports !== undefined) {
      if (result.imports.length !== test.expected.imports) {
        errors.push(`Expected ${test.expected.imports} imports, got ${result.imports.length}`)
        testPassed = false
      }
    }
    
    if (test.expected.components !== undefined) {
      if (result.components.length !== test.expected.components) {
        errors.push(`Expected ${test.expected.components} components, got ${result.components.length}`)
        testPassed = false
      }
    }
    
    if (test.expected.topLevelCode !== undefined) {
      if (result.topLevelCode.length !== test.expected.topLevelCode) {
        errors.push(`Expected ${test.expected.topLevelCode} top-level blocks, got ${result.topLevelCode.length}`)
        testPassed = false
      }
    }
    
    if (testPassed) {
      console.log('   ✅ PASSED')
      console.log(`      Metadata: isPage=${result.metadata.isPage}, route=${result.metadata.route || 'none'}`)
      console.log(`      Structure: ${result.imports.length} imports, ${result.components.length} components, ${result.topLevelCode.length} top-level blocks`)
      
      // Show component details
      if (result.components.length > 0) {
        const mainComponent = result.components.find(c => c.isDefault) || result.components[0]
        console.log(`      Main component: ${mainComponent.name} (${mainComponent.body.length} body statements)`)
        if (mainComponent.jsxReturn) {
          console.log(`      JSX: ${mainComponent.jsxReturn.type} with ${mainComponent.jsxReturn.children?.length || 0} children`)
        }
      }
      
      passed++
    } else {
      console.log('   ❌ FAILED')
      errors.forEach(error => console.log(`      - ${error}`))
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