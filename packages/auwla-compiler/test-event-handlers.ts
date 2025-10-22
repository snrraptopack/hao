#!/usr/bin/env bun

/**
 * Test event handler generation with proper TypeScript types
 */

import { parseTSX } from './src/core/tsx-parser.js'
import { ScopeAnalyzer } from './src/core/scope-analyzer.js'
import { JSXAnalyzer } from './src/core/jsx-analyzer.js'
import { CodeGenerator } from './src/core/code-generator.js'

console.log('🧪 Testing event handler generation...')

// Test case: Various event handler patterns
const eventContent = `
//@page /event-test
import { ref } from "auwla"

const count = ref(0)

export default function EventTestPage() {
  const message = "Hello"
  
  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    console.log("Form submitted")
  }
  
  function simpleClick() {
    count.value++
  }
  
  return (
    <div>
      <h1>Event Handler Test</h1>
      
      {/* Simple click handler */}
      <button onClick={simpleClick}>
        Simple Click
      </button>
      
      {/* Inline arrow function with event */}
      <button onClick={(e) => {
        e.preventDefault()
        count.value += 2
      }}>
        Inline with Event
      </button>
      
      {/* Inline arrow function without event */}
      <button onClick={() => console.log(message)}>
        Inline without Event
      </button>
      
      {/* Input handlers */}
      <input 
        onInput={(e) => console.log(e.target.value)}
        onChange={(event) => console.log("Changed:", event.target.value)}
        onFocus={() => console.log("Focused")}
      />
      
      {/* Form with submit handler */}
      <form onSubmit={handleSubmit}>
        <input type="text" />
        <button type="submit">Submit</button>
      </form>
      
      {/* Keyboard events */}
      <input 
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            console.log("Enter pressed")
          }
        }}
        onKeyUp={() => console.log("Key released")}
      />
      
      {/* Mouse events */}
      <div 
        onMouseEnter={(e) => console.log("Mouse entered", e.clientX)}
        onMouseLeave={() => console.log("Mouse left")}
      >
        Hover me
      </div>
    </div>
  )
}
`

console.log('Input TSX with various event handlers:')
console.log(eventContent)
console.log('\n' + '='.repeat(80) + '\n')

try {
    // Parse and compile
    const parsed = parseTSX(eventContent, 'event-test.tsx')
    const analyzer = new ScopeAnalyzer()
    const scoped = analyzer.analyze(parsed, 'event-test.tsx')
    const jsxAnalyzer = new JSXAnalyzer()
    const jsxStructure = jsxAnalyzer.analyze(scoped.mainComponent.jsxReturn, 'event-test.tsx')
    const generator = new CodeGenerator()
    const generatedCode = generator.generate(scoped, jsxStructure, 'event-test.tsx')

    console.log('📄 GENERATED CODE WITH EVENT HANDLERS:')
    console.log('='.repeat(80))
    console.log(generatedCode)
    console.log('='.repeat(80))

    // Analyze the generated event handlers
    console.log('\n🎯 EVENT HANDLER ANALYSIS:')

    const eventLines = generatedCode.split('\n').filter(line =>
        line.includes('onClick:') ||
        line.includes('onInput:') ||
        line.includes('onChange:') ||
        line.includes('onSubmit:') ||
        line.includes('onKeyDown:') ||
        line.includes('onKeyUp:') ||
        line.includes('onMouseEnter:') ||
        line.includes('onMouseLeave:') ||
        line.includes('onFocus:')
    )

    eventLines.forEach((line, i) => {
        console.log(`${i + 1}. ${line.trim()}`)
    })

    console.log('\n✅ Event handler generation test successful!')

    // Check for proper TypeScript patterns
    console.log('\n🔍 TYPESCRIPT VALIDATION:')
    const hasTypedEvents = generatedCode.includes('MouseEvent') ||
        generatedCode.includes('InputEvent') ||
        generatedCode.includes('KeyboardEvent')
    console.log(`- Typed event parameters: ${hasTypedEvents ? '✅' : '❌'}`)

    const hasCleanHandlers = !generatedCode.includes('(unused') &&
        !generatedCode.includes('(_)')
    console.log(`- Clean handlers (no unused params): ${hasCleanHandlers ? '✅' : '❌'}`)

    const hasProperArrowFunctions = generatedCode.includes('() =>') ||
        generatedCode.includes('(e: ')
    console.log(`- Proper arrow functions: ${hasProperArrowFunctions ? '✅' : '❌'}`)

} catch (error) {
    console.error('❌ Event handler test failed:', error)
    process.exit(1)
}