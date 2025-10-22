#!/usr/bin/env node

// Test the packaged compiler
import { compileTSX } from './dist/tsx-only-compiler.js'

const testContent = `
//@page/test
import { ref } from "auwla"

const counter = ref(0)

function increment() {
  counter.value++
}

export default function TestPage() {
  const localVar = "hello"
  
  return (
    <div>
      <p>{counter.value}</p>
      <p>{localVar}</p>
      <button onClick={increment}>Click</button>
    </div>
  )
}
`

console.log('🧪 Testing packaged compiler...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const result = compileTSX(testContent)
  console.log('Output:')
  console.log(result)
  console.log('\n✅ Package test successful!')
} catch (error) {
  console.error('❌ Package test failed:', error)
}