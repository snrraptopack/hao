#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'
import { readFileSync, writeFileSync } from 'fs'

console.log('🧪 Validating Regular Component (no @page) Example')
console.log('=' .repeat(50))

try {
  // Read the input file
  const input = readFileSync('test-case-3-regular-component.tsx', 'utf8')
  
  console.log('📄 INPUT TSX:')
  console.log(input)
  console.log('\n' + '=' .repeat(50) + '\n')
  
  // Compile it
  const output = compileTSX(input)
  
  // Save output
  writeFileSync('test-case-3-regular-component.js', output)
  
  console.log('📄 GENERATED OUTPUT:')
  console.log(output)
  console.log('\n' + '=' .repeat(50) + '\n')
  
  // Analyze scoping
  console.log('🔍 SCOPING ANALYSIS:')
  
  // Check global scope (variables outside export default - should stay global for non-@page)
  const globalScopeVars = ['theme', 'API_BASE', 'formatDate', 'toggleTheme']
  const hasGlobalScopeComment = output.includes('// Component helpers (shared across all components)')
  
  console.log(`✅ Global scope comment: ${hasGlobalScopeComment ? 'FOUND' : 'MISSING'}`)
  
  globalScopeVars.forEach(varName => {
    const inGlobalScope = output.includes(varName) && !output.includes('// Logic that was outside page scope')
    console.log(`   - ${varName}: ${inGlobalScope ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check UI scope (variables inside export default)
  const uiScopeVars = ['user', 'loading', 'loadUser']
  const hasPageScopeComment = output.includes('// Logic that was inside page scope → now inside Component UI scope')
  
  console.log(`✅ Should NOT have page scope comment: ${!hasPageScopeComment ? 'CORRECT' : 'INCORRECT'}`)
  
  uiScopeVars.forEach(varName => {
    const inUIScope = output.includes(varName)
    console.log(`   - ${varName}: ${inUIScope ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check overall structure
  console.log('\n🏗️ STRUCTURE ANALYSIS:')
  console.log(`✅ No @page directive: ${!input.includes('@page') ? 'CORRECT' : 'INCORRECT'}`)
  console.log(`✅ Has Component wrapper: ${output.includes('return Component((ui: LayoutBuilder)') ? 'YES' : 'NO'}`)
  console.log(`✅ Has proper imports: ${output.includes("import { Component, ref") ? 'YES' : 'NO'}`)
  console.log(`✅ Global helpers preserved: ${output.includes('// Component helpers (shared across all components)') ? 'YES' : 'NO'}`)
  
  console.log('\n🎉 Regular Component validation complete!')
  console.log('📁 Output saved to: test-case-3-regular-component.js')
  
} catch (error) {
  console.error('❌ Error:', error)
}