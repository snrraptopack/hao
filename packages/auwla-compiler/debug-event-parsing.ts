#!/usr/bin/env bun

/**
 * Debug event handler parsing
 */

import { parseTSX } from './src/core/tsx-parser.js'

const simpleEventContent = `
export default function Test() {
  return (
    <button onClick={() => console.log("clicked")}>
      Click me
    </button>
  )
}
`

console.log('🔍 Debugging event handler parsing...')
console.log('Input:', simpleEventContent)

try {
  const parsed = parseTSX(simpleEventContent, 'test.tsx')
  const mainComponent = parsed.components.find(c => c.isDefault)
  
  console.log('\n📊 Parsed JSX structure:')
  console.log(JSON.stringify(mainComponent?.jsxReturn, null, 2))
  
} catch (error) {
  console.error('❌ Debug failed:', error)
}