#!/usr/bin/env node

import { compileNewTSXWithDebug } from './src/new-tsx-compiler.js'

const testContent = `
//@page/test
import { ref } from "auwla"

const counter = ref(0)  // Outside page scope → should go inside page function

function increment() {  // Outside page scope → should go inside page function
  counter.value++
}

export default function TestPage() {  // This is the page function
  const localVar = "hello"  // Inside page scope → should go inside Component UI scope
  
  function localFunction() {  // Inside page scope → should go inside Component UI scope
    console.log("local")
  }
  
  return (
    <div>
      <p>{counter.value}</p>
      <p>{localVar}</p>
      <button onClick={increment}>Click</button>
    </div>
  )
}
`

console.log('🧪 Testing new TSX compiler architecture...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const result = compileNewTSXWithDebug(testContent, 'test.tsx')
  
  console.log('Debug Info:')
  console.log('TSX File:', JSON.stringify(result.debug.tsxFile, null, 2))
  console.log('\nScoped File:', JSON.stringify(result.debug.scopedFile, null, 2))
  console.log('\nJSX Structure:', JSON.stringify(result.debug.jsxStructure, null, 2))
  
  console.log('\n' + '='.repeat(60) + '\n')
  console.log('Generated Output:')
  console.log(result.output)
  
  console.log('\n✅ New compiler test successful!')
} catch (error) {
  console.error('❌ New compiler test failed:', error)
  console.error(error.stack)
}