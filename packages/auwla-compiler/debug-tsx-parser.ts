#!/usr/bin/env bun

/**
 * Debug TSX Parser to understand component detection
 */

import { parseTSX } from './src/core/tsx-parser.js'

const testInput = `
//@page /test-page
//@title Test Page
import { ref } from "auwla"

const globalCount = ref(0)

export default function TestPage() {
  const localVar = "local"
  
  return (
    <div>
      <h1>Test</h1>
      <p>{globalCount.value}</p>
    </div>
  )
}
`

console.log('🔍 Debugging TSX Parser...')
console.log('Input:')
console.log(testInput)
console.log('\n' + '='.repeat(50))

try {
  const result = parseTSX(testInput, 'debug.tsx')
  
  console.log('📊 PARSING RESULTS:')
  console.log(`Metadata:`, result.metadata)
  console.log(`Imports (${result.imports.length}):`)
  result.imports.forEach((imp, i) => {
    console.log(`  ${i + 1}. ${imp.source} -> ${imp.specifiers.map(s => s.local).join(', ')}`)
  })
  
  console.log(`\nComponents (${result.components.length}):`)
  result.components.forEach((comp, i) => {
    console.log(`  ${i + 1}. ${comp.name} (default: ${comp.isDefault}, exported: ${comp.isExported})`)
    console.log(`     Body statements: ${comp.body.length}`)
    console.log(`     JSX return: ${comp.jsxReturn ? comp.jsxReturn.type : 'none'}`)
    if (comp.body.length > 0) {
      comp.body.forEach((block, j) => {
        console.log(`       ${j + 1}. ${block.type}: ${block.code.substring(0, 50)}...`)
      })
    }
  })
  
  console.log(`\nTop-level code (${result.topLevelCode.length}):`)
  result.topLevelCode.forEach((block, i) => {
    console.log(`  ${i + 1}. ${block.type} (${block.scope}): ${block.code.substring(0, 50)}...`)
  })
  
} catch (error) {
  console.error('❌ Error:', error)
}