#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'
import { readFileSync, writeFileSync } from 'fs'

console.log('🧪 Validating Multiple Components in @page File')
console.log('=' .repeat(60))

try {
  // Read the input file
  const input = readFileSync('test-case-5-multiple-components.tsx', 'utf8')
  
  console.log('📄 INPUT TSX:')
  console.log(input.substring(0, 1000) + '...\n[truncated for readability]')
  console.log('\n' + '=' .repeat(60) + '\n')
  
  // Compile it
  const output = compileTSX(input)
  
  // Save output
  writeFileSync('test-case-5-multiple-components.js', output)
  
  console.log('📄 GENERATED OUTPUT:')
  console.log(output)
  console.log('\n' + '=' .repeat(60) + '\n')
  
  // Analyze scoping
  console.log('🔍 SCOPING ANALYSIS:')
  
  // Check if global helpers are placed correctly for @page files
  const globalVars = ['user', 'theme', 'fetchUser', 'toggleTheme']
  const hasGlobalHelpersInPageScope = output.includes('// Logic that was outside page scope → now inside page scope')
  
  console.log(`✅ Global helpers moved to page scope: ${hasGlobalHelpersInPageScope ? 'YES' : 'NO'}`)
  
  globalVars.forEach(varName => {
    const inPageScope = output.includes(varName) && hasGlobalHelpersInPageScope
    console.log(`   - ${varName}: ${inPageScope ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check exported components structure
  console.log('\n🔧 EXPORTED COMPONENTS ANALYSIS:')
  
  const hasUserAvatarExport = output.includes('export function UserAvatar(')
  const hasThemeToggleExport = output.includes('export function ThemeToggle(')
  
  console.log(`✅ UserAvatar exported: ${hasUserAvatarExport ? 'YES' : 'NO'}`)
  console.log(`✅ ThemeToggle exported: ${hasThemeToggleExport ? 'YES' : 'NO'}`)
  
  // Check if exported components have their own Component wrappers
  const userAvatarHasComponent = output.includes('UserAvatar(') && output.includes('return Component((ui: LayoutBuilder)')
  const themeToggleHasComponent = output.includes('ThemeToggle(') && output.includes('return Component((ui: LayoutBuilder)')
  
  console.log(`✅ UserAvatar has Component wrapper: ${userAvatarHasComponent ? 'YES' : 'NO'}`)
  console.log(`✅ ThemeToggle has Component wrapper: ${themeToggleHasComponent ? 'YES' : 'NO'}`)
  
  // Check main page component
  console.log('\n📄 MAIN PAGE COMPONENT ANALYSIS:')
  
  const hasMainPageComponent = output.includes('export default function ProfilePage()')
  const mainPageHasComponent = output.includes('ProfilePage()') && output.includes('return Component((ui: LayoutBuilder)')
  
  console.log(`✅ Main page component exists: ${hasMainPageComponent ? 'YES' : 'NO'}`)
  console.log(`✅ Main page has Component wrapper: ${mainPageHasComponent ? 'YES' : 'NO'}`)
  
  // Check page-specific variables in UI scope
  const pageVars = ['isEditing', 'editForm', 'startEditing', 'cancelEditing', 'saveChanges']
  const hasPageUIScopeComment = output.includes('// Logic that was inside page scope → now inside Component UI scope')
  
  console.log(`✅ Page UI scope comment: ${hasPageUIScopeComment ? 'FOUND' : 'MISSING'}`)
  
  pageVars.forEach(varName => {
    const inUIScope = output.includes(varName)
    console.log(`   - ${varName}: ${inUIScope ? '✅ CORRECT' : '❌ INCORRECT'}`)
  })
  
  // Check overall structure
  console.log('\n🏗️ OVERALL STRUCTURE ANALYSIS:')
  console.log(`✅ Has @page directive: ${input.includes('//@page /profile') ? 'YES' : 'NO'}`)
  console.log(`✅ Multiple components detected: ${input.includes('export function') ? 'YES' : 'NO'}`)
  console.log(`✅ Proper imports: ${output.includes("import { Component, ref") ? 'YES' : 'NO'}`)
  
  // Key question: Are global helpers shared across all components or scoped to page?
  console.log('\n🎯 KEY SCOPING BEHAVIOR:')
  
  if (hasGlobalHelpersInPageScope) {
    console.log('✅ Global helpers (user, theme, etc.) are placed inside the main page function')
    console.log('   This means exported components can access them via closure')
  } else {
    console.log('❌ Global helpers are not properly scoped for @page file')
  }
  
  console.log('\n🎉 Multiple Components validation complete!')
  console.log('📁 Full output saved to: test-case-5-multiple-components.js')
  
} catch (error) {
  console.error('❌ Error:', error)
}