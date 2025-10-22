#!/usr/bin/env bun

/**
 * Test end-to-end TSX compilation pipeline
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { ScopeAnalyzer } from './src/core/scope-analyzer.js'
import { JSXAnalyzer } from './src/core/jsx-analyzer.js'
import { CodeGenerator } from './src/core/code-generator.js'

console.log('🧪 Testing End-to-End TSX Compilation...')
console.log('=' .repeat(60))

const testInput = `
//@page /test-page
//@title Test Page
import { ref, computed, watch } from "auwla"

// Top-level code (should go to component scope)
const globalCount = ref(0)
const API_URL = "https://api.example.com"

function calculateDouble(n) {
  return n * 2
}

export default function TestPage() {
  // Component body code (should go to UI scope)
  const localMessage = ref("Hello")
  const isVisible = ref(true)
  
  const doubledCount = computed(() => calculateDouble(globalCount.value))
  
  const handleIncrement = () => {
    globalCount.value++
  }
  
  const handleToggle = () => {
    isVisible.value = !isVisible.value
  }
  
  return (
    <div className={isVisible.value ? "visible" : "hidden"}>
      <h1>{localMessage.value}</h1>
      <p>Count: {globalCount.value}</p>
      <p>Doubled: {doubledCount.value}</p>
      
      <button onClick={handleIncrement}>
        Increment
      </button>
      
      <button onClick={handleToggle}>
        {isVisible.value ? "Hide" : "Show"}
      </button>
      
      {isVisible.value && (
        <div className="info">
          <span>This is conditionally visible</span>
        </div>
      )}
    </div>
  )
}
`

try {
  console.log('📄 INPUT TSX:')
  console.log(testInput)
  console.log('\n' + '='.repeat(60))
  
  // Step 1: Parse TSX
  console.log('🔍 Step 1: Parsing TSX...')
  const parsed = parseTSX(testInput, 'test-page.tsx')
  console.log(`✅ Parsed: ${parsed.imports.length} imports, ${parsed.components.length} components, ${parsed.topLevelCode.length} top-level blocks`)
  
  // Step 2: Analyze scoping
  console.log('\n📦 Step 2: Analyzing scoping...')
  const analyzer = new ScopeAnalyzer()
  const scoped = analyzer.analyze(parsed, 'test-page.tsx')
  console.log(`✅ Scoped: ${scoped.componentScope.length} component scope, ${scoped.uiScope.length} UI scope`)
  
  // Step 3: Analyze JSX
  console.log('\n🎨 Step 3: Analyzing JSX...')
  const jsxAnalyzer = new JSXAnalyzer()
  const jsxStructure = jsxAnalyzer.analyze(scoped.mainComponent.jsxReturn, 'test-page.tsx')
  console.log(`✅ JSX: ${jsxStructure.elements.length} elements, ${jsxStructure.expressions.length} expressions`)
  
  // Step 4: Generate code
  console.log('\n⚡ Step 4: Generating code...')
  const generator = new CodeGenerator()
  const generatedCode = generator.generate(scoped, jsxStructure, 'test-page.tsx')
  
  console.log('\n📄 GENERATED CODE:')
  console.log('='.repeat(60))
  console.log(generatedCode)
  console.log('='.repeat(60))
  
  // Analyze the generated code
  console.log('\n🔍 CODE ANALYSIS:')
  
  const codeLines = generatedCode.split('\n')
  const importLines = codeLines.filter(line => line.trim().startsWith('import'))
  const componentScopeStart = codeLines.findIndex(line => line.includes('// Logic that was outside page scope'))
  const uiScopeStart = codeLines.findIndex(line => line.includes('// Logic that was inside page scope'))
  const jsxStart = codeLines.findIndex(line => line.includes('// Generated UI from JSX'))
  
  console.log(`📦 Imports: ${importLines.length} lines`)
  importLines.forEach(line => console.log(`  ${line.trim()}`))
  
  console.log(`\n🏗️  Structure:`)
  console.log(`  Component scope starts at line: ${componentScopeStart + 1}`)
  console.log(`  UI scope starts at line: ${uiScopeStart + 1}`)
  console.log(`  JSX generation starts at line: ${jsxStart + 1}`)
  
  // Check for specific patterns
  const patterns = [
    { name: 'Page function export', pattern: /export default function \w+Page\(\)/, expected: true },
    { name: 'Component callback', pattern: /return Component\(\(ui\) => \{/, expected: true },
    { name: 'Reactive expressions', pattern: /watch\(\[.*\], \(\) => .*\) as Ref</, expected: true },
    { name: 'Event handlers', pattern: /on: \{ \w+: .*\}/, expected: true },
    { name: 'Conditional rendering', pattern: /if \(.*\) \{/, expected: true },
    { name: 'UI method calls', pattern: /ui\.\w+\(/, expected: true }
  ]
  
  console.log(`\n✅ PATTERN VALIDATION:`)
  patterns.forEach(({ name, pattern, expected }) => {
    const found = pattern.test(generatedCode)
    const status = found === expected ? '✅' : '❌'
    console.log(`  ${status} ${name}: ${found ? 'Found' : 'Not found'}`)
  })
  
  console.log('\n🎯 END-TO-END COMPILATION COMPLETE!')
  
} catch (error) {
  console.error('❌ Compilation failed:', error)
  process.exit(1)
}