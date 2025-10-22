#!/usr/bin/env bun

/**
 * Test the complete compilation pipeline
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { ScopeAnalyzer } from './src/core/scope-analyzer.js'
import { JSXAnalyzer } from './src/core/jsx-analyzer.js'
import { CodeGenerator } from './src/core/code-generator.js'

console.log('🧪 Testing complete compilation pipeline...')

// Test case: Page component with scoping
const pageContent = `
//@page /complete-test
//@title Complete Test Page
import { ref, computed } from "auwla"

const counter = ref(0)
const multiplier = ref(2)

function increment() {
  counter.value++
}

function getDoubled() {
  return counter.value * multiplier.value
}

export default function CompleteTestPage({ title }: { title: string }) {
  const message = "Hello from page"
  const doubled = computed(() => getDoubled())
  
  function handleClick() {
    increment()
    console.log(message)
  }
  
  return (
    <div className="container">
      <h1>{title}</h1>
      <p>{message}</p>
      <p>Counter: {counter.value}</p>
      <p>Doubled: {doubled.value}</p>
      <button onClick={handleClick}>
        Click me ({counter.value})
      </button>
    </div>
  )
}
`

console.log('Input TSX:')
console.log(pageContent)
console.log('\n' + '='.repeat(80) + '\n')

try {
  // Step 1: Parse TSX
  console.log('📝 Step 1: Parsing TSX...')
  const parsed = parseTSX(pageContent, 'complete-test.tsx')
  console.log(`✅ Found ${parsed.components.length} components, ${parsed.topLevelCode.length} top-level blocks`)
  
  // Step 2: Analyze scoping
  console.log('\n🔍 Step 2: Analyzing scoping...')
  const analyzer = new ScopeAnalyzer()
  const scoped = analyzer.analyze(parsed, 'complete-test.tsx')
  console.log(`✅ Component scope: ${scoped.componentScope.length} blocks, UI scope: ${scoped.uiScope.length} blocks`)
  
  // Step 3: Analyze JSX
  console.log('\n🏗️  Step 3: Analyzing JSX...')
  const jsxAnalyzer = new JSXAnalyzer()
  const jsxStructure = jsxAnalyzer.analyze(scoped.mainComponent.jsxReturn, 'complete-test.tsx')
  console.log(`✅ Found ${jsxStructure.elements.length} elements, ${jsxStructure.expressions.length} expressions`)
  
  // Step 4: Generate code
  console.log('\n⚡ Step 4: Generating code...')
  const generator = new CodeGenerator()
  const generatedCode = generator.generate(scoped, jsxStructure, 'complete-test.tsx')
  
  console.log('📄 GENERATED AUWLA COMPONENT:')
  console.log('='.repeat(80))
  console.log(generatedCode)
  console.log('='.repeat(80))
  
  console.log('\n✅ Complete compilation pipeline test successful!')
  
  // Show scoping transformation
  console.log('\n📊 SCOPING TRANSFORMATION SUMMARY:')
  console.log('Original TSX structure → Generated Auwla structure')
  console.log('- Top-level code (outside export default) → Component scope (inside page function)')
  console.log('- Component body code (inside export default) → UI scope (inside Component callback)')
  
  console.log('\nComponent Scope (inside page function):')
  scoped.componentScope.forEach((block, i) => {
    console.log(`  ${i + 1}. ${block.code.split('\n')[0]}...`)
  })
  
  console.log('\nUI Scope (inside Component callback):')
  scoped.uiScope.forEach((block, i) => {
    console.log(`  ${i + 1}. ${block.code.split('\n')[0]}...`)
  })
  
} catch (error) {
  console.error('❌ Compilation pipeline test failed:', error)
  process.exit(1)
}