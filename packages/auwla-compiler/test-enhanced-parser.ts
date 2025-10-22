#!/usr/bin/env node

import { parseTSX } from './src/core/tsx-parser.js'

const testContent = `
//@page /enhanced-test
//@title Enhanced Test Page
//@description Testing enhanced parser functionality
//@guard authenticated
import { ref, computed } from "auwla"
import { useState } from "react"

const globalCounter = ref(0)
const multiplier = ref(2)

function increment() {
  globalCounter.value++
}

function getMultiplied() {
  return globalCounter.value * multiplier.value
}

export default function EnhancedTestPage({ title }: { title: string }) {
  const localState = useState(false)
  const computedValue = computed(() => getMultiplied())
  
  function handleClick() {
    increment()
    localState[1](true)
  }
  
  return (
    <div className="container">
      <h1>{title}</h1>
      <p>Counter: {globalCounter.value}</p>
      <p>Multiplied: {computedValue.value}</p>
      <button onClick={handleClick}>
        Click me
      </button>
      {localState[0] && (
        <div className="alert">
          <span>Button was clicked!</span>
        </div>
      )}
    </div>
  )
}
`

console.log('🧪 Testing enhanced TSX parser...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const result = parseTSX(testContent, 'enhanced-test.tsx')
  
  console.log('Parsed Result:')
  console.log('Metadata:', JSON.stringify(result.metadata, null, 2))
  console.log('\nImports:', JSON.stringify(result.imports, null, 2))
  console.log('\nTop-level Code:')
  result.topLevelCode.forEach((block, i) => {
    console.log(`  ${i + 1}. ${block.type}: ${block.code.substring(0, 50)}...`)
    console.log(`     Dependencies: [${block.dependencies.join(', ')}]`)
  })
  console.log('\nComponents:')
  result.components.forEach((comp, i) => {
    console.log(`  ${i + 1}. ${comp.name} (default: ${comp.isDefault}, exported: ${comp.isExported})`)
    console.log(`     Params: ${comp.params.map(p => p.name).join(', ')}`)
    console.log(`     Body blocks: ${comp.body.length}`)
    if (comp.jsxReturn) {
      console.log(`     JSX: ${comp.jsxReturn.type} (${comp.jsxReturn.tag || 'no tag'})`)
    }
  })
  
  console.log('\n✅ Enhanced parser test successful!')
} catch (error) {
  console.error('❌ Enhanced parser test failed:', error)
  console.error(error.stack)
}