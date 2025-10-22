#!/usr/bin/env bun

/**
 * Test the JSX analyzer functionality
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { JSXAnalyzer } from './src/core/jsx-analyzer.js'

console.log('🧪 Testing JSX analyzer...')

// Test case: Complex JSX with various patterns
const jsxContent = `
//@page /jsx-test
import { ref, computed } from "auwla"

const items = ref(['apple', 'banana', 'cherry'])
const showList = ref(true)
const count = ref(0)

export default function JSXTestPage() {
  const message = "Hello World"
  
  return (
    <div className="container">
      <h1>{message}</h1>
      <p>Count: {count.value}</p>
      
      {showList.value && (
        <div className="list-container">
          <h2>Items:</h2>
          <ul>
            {items.value.map(item => (
              <li key={item} onClick={() => console.log(item)}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <button 
        onClick={() => count.value++}
        disabled={count.value >= 10}
        className={count.value > 5 ? "warning" : "normal"}
      >
        Increment ({count.value})
      </button>
      
      {count.value > 5 ? (
        <div className="warning">High count!</div>
      ) : (
        <div className="info">Count is low</div>
      )}
    </div>
  )
}
`

console.log('Input JSX:')
console.log(jsxContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  // Parse the TSX
  const parsed = parseTSX(jsxContent, 'jsx-test.tsx')
  
  // Find the main component and its JSX
  const mainComponent = parsed.components.find(c => c.isDefault)
  if (!mainComponent || !mainComponent.jsxReturn) {
    throw new Error('No JSX found in main component')
  }
  
  // Analyze JSX structure
  const analyzer = new JSXAnalyzer()
  const structure = analyzer.analyze(mainComponent.jsxReturn, 'jsx-test.tsx')
  
  console.log('📊 JSX ANALYSIS RESULTS:')
  
  console.log('\n🏗️  UI Elements:')
  structure.elements.forEach((element, i) => {
    console.log(`  ${i + 1}. <${element.tag}>`)
    if (element.props.length > 0) {
      element.props.forEach(prop => {
        const reactive = prop.isReactive ? ' (reactive)' : ''
        console.log(`     - ${prop.name}: ${prop.value}${reactive}`)
      })
    }
    if (element.events.length > 0) {
      element.events.forEach(event => {
        console.log(`     - on${event.event}: ${event.handler}`)
      })
    }
  })
  
  console.log('\n🔄 Reactive Expressions:')
  structure.expressions.forEach((expr, i) => {
    console.log(`  ${i + 1}. [${expr.type}] ${expr.expression}`)
    console.log(`     Dependencies: [${expr.dependencies.join(', ')}]`)
    console.log(`     Watch: ${expr.isWatch}`)
  })
  
  console.log('\n❓ Conditionals:')
  structure.conditionals.forEach((cond, i) => {
    console.log(`  ${i + 1}. Condition: ${cond.condition.expression}`)
    console.log(`     Dependencies: [${cond.condition.dependencies.join(', ')}]`)
    console.log(`     Then blocks: ${cond.thenBlock.length}`)
    console.log(`     Else blocks: ${cond.elseBlock?.length || 0}`)
  })
  
  console.log('\n🔁 Loops:')
  structure.loops.forEach((loop, i) => {
    console.log(`  ${i + 1}. Iterable: ${loop.iterable.expression}`)
    console.log(`     Item name: ${loop.itemName}`)
    console.log(`     Index name: ${loop.indexName || 'none'}`)
    console.log(`     Dependencies: [${loop.iterable.dependencies.join(', ')}]`)
  })
  
  console.log('\n✅ JSX analyzer test successful!')
  
} catch (error) {
  console.error('❌ JSX analyzer test failed:', error)
  process.exit(1)
}