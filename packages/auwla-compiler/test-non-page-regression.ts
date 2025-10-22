#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'

const testContent = `
import { ref } from "auwla"

const globalCounter = ref(0)  // Outside component → should stay global

function globalIncrement() {  // Outside component → should stay global
  globalCounter.value++
}

export default function RegularComponent() {  // Regular component (no @page)
  const localVar = "hello"  // Inside component → should go inside Component UI scope
  
  function localFunction() {  // Inside component → should go inside Component UI scope
    console.log("local")
  }
  
  return (
    <div>
      <p>{globalCounter.value}</p>
      <p>{localVar}</p>
      <button onClick={globalIncrement}>Click</button>
    </div>
  )
}
`

console.log('🔍 Testing non-@page file (should preserve existing behavior)...')
console.log('Input:')
console.log(testContent)
console.log('\n' + '='.repeat(60) + '\n')

try {
  const result = compileTSX(testContent)
  console.log('Output:')
  console.log(result)
  
  console.log('\n' + '='.repeat(60) + '\n')
  console.log('✅ VERIFICATION:')
  if (result.includes('const globalCounter = ref(0)\nfunction globalIncrement()')) {
    console.log('✅ Global helpers stay global - CORRECT')
  } else {
    console.log('❌ Global helpers not placed correctly')
  }
  
  if (result.includes('const localVar = "hello"') && result.includes('function localFunction()')) {
    console.log('✅ Local variables go to UI scope - CORRECT')
  } else {
    console.log('❌ Local variables not placed correctly')
  }
  
} catch (error) {
  console.error('Error:', error)
}