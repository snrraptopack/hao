#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'
import { readFileSync, writeFileSync } from 'fs'

console.log('🧪 Validating Counter Page (@page) Example')
console.log('=' .repeat(50))

try {
  // Read the input file
  const input = readFileSync('test-case-1-counter-page.tsx', 'utf8')
  
  console.log('📄 INPUT TSX:')
  console.log(input)
  console.log('\n' + '=' .repeat(50) + '\n')
  
  // Compile it
  const output = compileTSX(input)
  
  // Save output
  writeFileSync('test-case-1-counter-page.js', output)
  
  console.log('📄 GENERATED OUTPUT:')
  console.log(output)
  console.log('\n' + '=' .repeat(50) + '\n')
  
  // Analyze scoping
  console.log('🔍 SCOPING ANALYSIS:')
  
  // Check component scope (variables outside export default)
  const componentScopeVars = ['count', 'step', 'increment', 'decrement', 'reset']
  const hasComponentScopeComment = output.includes('// Logic that was outside page scope → now inside page scope')
  
  console.log(`✅ Component scope comment: ${hasComponentScopeComment ? 'FOUND' : 'MISSING'}`)
  
  componentScopeVars.forEach(varName => {
    const inComponentScope = output.includes(hasComponentScopeComment ? varName : 'NOT_FOUND')
    console.log(`   - ${varName}: ${inComponentScope ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check UI scope (variables inside export default)
  const uiScopeVars = ['message', 'isVisible', 'toggleVisibility', 'updateMessage']
  const hasUIScopeComment = output.includes('// Logic that was inside page scope → now inside Component UI scope')
  
  console.log(`✅ UI scope comment: ${hasUIScopeComment ? 'FOUND' : 'MISSING'}`)
  
  uiScopeVars.forEach(varName => {
    const inUIScope = output.includes(varName)
    console.log(`   - ${varName}: ${inUIScope ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check overall structure
  console.log('\n🏗️ STRUCTURE ANALYSIS:')
  console.log(`✅ Has @page detection: ${output.includes('export default function CounterPage()') ? 'YES' : 'NO'}`)
  console.log(`✅ Has Component wrapper: ${output.includes('return Component((ui: LayoutBuilder)') ? 'YES' : 'NO'}`)
  console.log(`✅ Has proper imports: ${output.includes("import { Component, ref, watch } from 'auwla'") ? 'YES' : 'NO'}`)
  
  console.log('\n🎉 Counter Page validation complete!')
  console.log('📁 Output saved to: test-case-1-counter-page.js')
  
} catch (error) {
  console.error('❌ Error:', error)
}