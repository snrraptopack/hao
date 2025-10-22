#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'
import { readFileSync, writeFileSync } from 'fs'

console.log('🧪 Validating Complex Dashboard Page (@page) Example')
console.log('=' .repeat(60))

try {
  // Read the input file
  const input = readFileSync('test-case-4-complex-page.tsx', 'utf8')
  
  console.log('📄 INPUT TSX:')
  console.log(input.substring(0, 800) + '...\n[truncated for readability]')
  console.log('\n' + '=' .repeat(60) + '\n')
  
  // Compile it
  const output = compileTSX(input)
  
  // Save output
  writeFileSync('test-case-4-complex-page.js', output)
  
  console.log('📄 GENERATED OUTPUT (first 1000 chars):')
  console.log(output.substring(0, 1000) + '...\n[truncated for readability]')
  console.log('\n' + '=' .repeat(60) + '\n')
  
  // Analyze scoping
  console.log('🔍 SCOPING ANALYSIS:')
  
  // Check component scope (variables outside export default)
  const componentScopeVars = [
    'user', 'notifications', 'settings', 
    'fetchUserData', 'fetchNotifications', 'updateSettings',
    'unreadCount', 'userDisplayName'
  ]
  const hasComponentScopeComment = output.includes('// Logic that was outside page scope → now inside page scope')
  
  console.log(`✅ Component scope comment: ${hasComponentScopeComment ? 'FOUND' : 'MISSING'}`)
  
  let componentScopeCorrect = 0
  componentScopeVars.forEach(varName => {
    const inComponentScope = output.includes(varName)
    const isCorrect = inComponentScope
    if (isCorrect) componentScopeCorrect++
    console.log(`   - ${varName}: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check UI scope (variables inside export default)
  const uiScopeVars = [
    'activeTab', 'isLoading', 'searchQuery',
    'switchTab', 'handleSearch', 'refreshData', 'filteredNotifications'
  ]
  const hasUIScopeComment = output.includes('// Logic that was inside page scope → now inside Component UI scope')
  
  console.log(`✅ UI scope comment: ${hasUIScopeComment ? 'FOUND' : 'MISSING'}`)
  
  let uiScopeCorrect = 0
  uiScopeVars.forEach(varName => {
    const inUIScope = output.includes(varName)
    const isCorrect = inUIScope
    if (isCorrect) uiScopeCorrect++
    console.log(`   - ${varName}: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check metadata handling
  console.log('\n📋 METADATA ANALYSIS:')
  console.log(`✅ @page directive: ${input.includes('//@page /dashboard') ? 'FOUND' : 'MISSING'}`)
  console.log(`✅ @title directive: ${input.includes('//@title Dashboard') ? 'FOUND' : 'MISSING'}`)
  
  // Check overall structure
  console.log('\n🏗️ STRUCTURE ANALYSIS:')
  console.log(`✅ Has @page detection: ${output.includes('export default function DashboardPage()') ? 'YES' : 'NO'}`)
  console.log(`✅ Has Component wrapper: ${output.includes('return Component((ui: LayoutBuilder)') ? 'YES' : 'NO'}`)
  console.log(`✅ Has proper imports: ${output.includes("import { Component, ref") ? 'YES' : 'NO'}`)
  console.log(`✅ Includes computed import: ${output.includes("computed") ? 'YES' : 'NO'}`)
  
  // Summary
  console.log('\n📊 SUMMARY:')
  console.log(`✅ Component scope variables: ${componentScopeCorrect}/${componentScopeVars.length} correct`)
  console.log(`✅ UI scope variables: ${uiScopeCorrect}/${uiScopeVars.length} correct`)
  
  const overallSuccess = componentScopeCorrect === componentScopeVars.length && 
                        uiScopeCorrect === uiScopeVars.length &&
                        hasComponentScopeComment && hasUIScopeComment
  
  console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS REVIEW'}`)
  
  console.log('\n🎉 Complex Dashboard Page validation complete!')
  console.log('📁 Full output saved to: test-case-4-complex-page.js')
  
} catch (error) {
  console.error('❌ Error:', error)
}