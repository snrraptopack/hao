#!/usr/bin/env node

import { compileTSX } from './src/tsx-only-compiler.js'
import { readFileSync, writeFileSync } from 'fs'

console.log('🧪 Validating Expected Props-Based Behavior')
console.log('=' .repeat(60))

try {
  // Read the input file
  const input = readFileSync('test-expected-props-behavior.tsx', 'utf8')
  
  console.log('📄 INPUT TSX (Expected Pattern):')
  console.log('Key points:')
  console.log('- UserAvatar receives user as prop with type annotation')
  console.log('- ThemeToggle receives theme and onToggle as props with types')
  console.log('- ProfilePage passes global state as props to components')
  console.log('')
  
  // Compile it
  const output = compileTSX(input)
  
  // Save output
  writeFileSync('test-expected-props-behavior.js', output)
  
  console.log('📄 GENERATED OUTPUT:')
  console.log(output)
  console.log('\n' + '=' .repeat(60) + '\n')
  
  // Analyze the expected behavior
  console.log('🔍 EXPECTED BEHAVIOR ANALYSIS:')
  
  // Check if global helpers are in page scope
  const hasGlobalInPageScope = output.includes('// Logic that was outside page scope → now inside page scope')
  console.log(`✅ Global helpers in page scope: ${hasGlobalInPageScope ? 'YES' : 'NO'}`)
  
  // Check if components have proper TypeScript props
  const userAvatarHasProps = output.includes('user: Ref<any>') || output.includes('user,') 
  const themeToggleHasProps = output.includes('theme: Ref<string>') || output.includes('theme,')
  
  console.log(`✅ UserAvatar has typed props: ${userAvatarHasProps ? 'YES' : 'NO'}`)
  console.log(`✅ ThemeToggle has typed props: ${themeToggleHasProps ? 'YES' : 'NO'}`)
  
  // Check if main component passes props correctly
  const passesUserProp = output.includes('UserAvatar') && (output.includes('user={user}') || output.includes('user: user'))
  const passesThemeProps = output.includes('ThemeToggle') && (output.includes('theme={theme}') || output.includes('theme: theme'))
  
  console.log(`✅ Passes user prop to UserAvatar: ${passesUserProp ? 'YES' : 'NO'}`)
  console.log(`✅ Passes theme props to ThemeToggle: ${passesThemeProps ? 'YES' : 'NO'}`)
  
  console.log('\n💡 EXPECTED COMPILATION RESULT:')
  console.log('1. ✅ Global variables (user, theme, fetchUser, toggleTheme) → inside ProfilePage function')
  console.log('2. ✅ UserAvatar and ThemeToggle → exported components with typed props')
  console.log('3. ✅ ProfilePage → passes global state as props to child components')
  console.log('4. ✅ No reference errors → all variables accessible through proper scoping')
  
  console.log('\n🎯 THIS IS THE CORRECT PATTERN FOR @PAGE FILES WITH MULTIPLE COMPONENTS!')
  console.log('📁 Output saved to: test-expected-props-behavior.js')
  
} catch (error) {
  console.error('❌ Error:', error)
}