#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'

const testContent = `
//@page
import { ref } from "auwla"

const counter = ref(0)  // Outside page scope → should go inside page function

function increment() {  // Outside page scope → should go inside page function
  counter.value++
}

export default function HomePage() {  // This is the page function
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

console.log('🔍 Testing scoping issue...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const result = compileTSX(testContent)
  console.log('Output:')
  console.log(result)
} catch (error) {
  console.error('Error:', error)
}