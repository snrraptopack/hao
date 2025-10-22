#!/usr/bin/env bun

/**
 * Test reactive expression handling
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { ScopeAnalyzer } from './src/core/scope-analyzer.js'
import { JSXAnalyzer } from './src/core/jsx-analyzer.js'
import { CodeGenerator } from './src/core/code-generator.js'

console.log('🧪 Testing reactive expression handling...')

// Test case: Various reactive expression patterns
const reactiveContent = `
//@page /reactive-test
import { ref, watch } from "auwla"

const count = ref(0)
const message = ref("Hello")
const isActive = ref(true)
const user = ref({ name: "John", age: 30 })

export default function ReactiveTestPage() {
  const doubled = watch(count, (v) => v * 2)
  const greeting = watch([message, user], ([msg, u]) => \`\${msg}, \${u.name}!\`)
  
  return (
    <div className={isActive.value ? "active" : "inactive"}>
      <h1>{message.value}</h1>
      <p>Count: {count.value}</p>
      <p>Doubled: {doubled.value}</p>
      <p>{greeting.value}</p>
      
      {/* Mixed content */}
      <p>User {user.value.name} is {user.value.age} years old</p>
      
      {/* Reactive className */}
      <div className={count.value > 5 ? "high" : "low"}>
        Status indicator
      </div>
      
      {/* Reactive input value */}
      <input 
        type="text" 
        value={message.value}
        placeholder="Enter message"
      />
      
      {/* Conditional rendering */}
      {isActive.value && (
        <div>
          <p>This is shown when active</p>
        </div>
      )}
      
      {/* List rendering */}
      <ul>
        {["item1", "item2", "item3"].map(item => (
          <li key={item}>{item}: {count.value}</li>
        ))}
      </ul>
    </div>
  )
}
`

console.log('Input TSX with reactive expressions:')
console.log(reactiveContent)
console.log('\n' + '='.repeat(80) + '\n')

try {
  // Parse and compile
  const parsed = parseTSX(reactiveContent, 'reactive-test.tsx')
  const analyzer = new ScopeAnalyzer()
  const scoped = analyzer.analyze(parsed, 'reactive-test.tsx')
  const jsxAnalyzer = new JSXAnalyzer()
  const jsxStructure = jsxAnalyzer.analyze(scoped.mainComponent.jsxReturn, 'reactive-test.tsx')
  const generator = new CodeGenerator()
  const generatedCode = generator.generate(scoped, jsxStructure, 'reactive-test.tsx')
  
  console.log('📄 GENERATED CODE WITH REACTIVE EXPRESSIONS:')
  console.log('='.repeat(80))
  console.log(generatedCode)
  console.log('='.repeat(80))
  
  // Analyze reactive patterns
  console.log('\n🔄 REACTIVE PATTERN ANALYSIS:')
  
  const reactivePatterns = [
    { pattern: /text: \w+(?!\.value)/, description: 'Direct ref usage (text: ref)' },
    { pattern: /String\([^)]+\.value\)/, description: 'String wrapped reactive values' },
    { pattern: /className: \w+(?!\.value)/, description: 'Direct ref for className' },
    { pattern: /value: \w+(?!\.value)/, description: 'Direct ref for input values' },
    { pattern: /watch\(/, description: 'Watch expressions for computed values' }
  ]
  
  reactivePatterns.forEach(({ pattern, description }) => {
    const matches = generatedCode.match(pattern)
    const count = matches ? matches.length : 0
    console.log(`- ${description}: ${count > 0 ? '✅' : '❌'} (${count} found)`)
  })
  
  console.log('\n✅ Reactive expression test successful!')
  
  // Check for proper Auwla patterns
  console.log('\n🔍 AUWLA PATTERN VALIDATION:')
  const hasDirectRefs = generatedCode.includes('text: count') || generatedCode.includes('text: message')
  console.log(`- Direct ref usage: ${hasDirectRefs ? '✅' : '❌'}`)
  
  const hasStringWrapping = generatedCode.includes('String(')
  console.log(`- String wrapping for interpolation: ${hasStringWrapping ? '✅' : '❌'}`)
  
  const hasReactiveClassName = generatedCode.includes('className: isActive') || generatedCode.includes('className: count')
  console.log(`- Reactive className: ${hasReactiveClassName ? '✅' : '❌'}`)
  
  const hasWatchExpressions = generatedCode.includes('watch(')
  console.log(`- Watch expressions: ${hasWatchExpressions ? '✅' : '❌'}`)
  
} catch (error) {
  console.error('❌ Reactive expression test failed:', error)
  process.exit(1)
}