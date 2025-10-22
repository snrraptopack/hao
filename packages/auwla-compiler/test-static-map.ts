// Test static array mapping detection

const testExpressions = [
  // Static array literal
  "['all', 'active', 'completed'].map(filterType => <button>{filterType}</button>)",
  
  // Variable array
  "items.map(item => <div>{item}</div>)",
  
  // Reactive array
  "items.value.map(item => <div>{item}</div>)"
]

import { detectArrayMapping, generateArrayMappingUICode } from './src/tsx-compiler'

console.log('🧪 Testing static array mapping detection...')
console.log('===========================================')

testExpressions.forEach((expr, index) => {
  console.log(`Test ${index + 1}: ${expr.substring(0, 60)}...`)
  console.log('---')
  
  const detection = detectArrayMapping(expr)
  console.log(`Detection result: ${detection.isArrayMapping ? 'YES' : 'NO'}`)
  
  if (detection.isArrayMapping) {
    const generated = generateArrayMappingUICode(expr)
    console.log(`Generation result: ${generated ? 'SUCCESS' : 'FAILED'}`)
    if (generated) {
      console.log(`Generated code: ${generated.substring(0, 100)}...`)
    }
  }
  
  console.log('')
})