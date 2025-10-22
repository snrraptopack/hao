#!/usr/bin/env bun

/**
 * Debug JSX event extraction
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { JSXAnalyzer } from './src/core/jsx-analyzer.js'

const simpleEventContent = `
export default function Test() {
  return (
    <button onClick={() => console.log("clicked")}>
      Click me
    </button>
  )
}
`

console.log('🔍 Debugging JSX event extraction...')

try {
  const parsed = parseTSX(simpleEventContent, 'test.tsx')
  const mainComponent = parsed.components.find(c => c.isDefault)
  
  console.log('\n📊 Parsed JSX structure:')
  console.log(JSON.stringify(mainComponent?.jsxReturn, null, 2))
  
  if (mainComponent?.jsxReturn) {
    const analyzer = new JSXAnalyzer()
    const structure = analyzer.analyze(mainComponent.jsxReturn, 'test.tsx')
    
    console.log('\n📊 Analyzed JSX structure:')
    console.log('Elements:', structure.elements.length)
    structure.elements.forEach((el, i) => {
      console.log(`  ${i + 1}. ${el.tag}`)
      console.log(`     Props: ${el.props.length}`)
      el.props.forEach(prop => {
        console.log(`       - ${prop.name}: ${prop.value}`)
      })
      console.log(`     Events: ${el.events.length}`)
      el.events.forEach(event => {
        console.log(`       - ${event.event}: ${event.handler}`)
      })
    })
  }
  
} catch (error) {
  console.error('❌ Debug failed:', error)
}