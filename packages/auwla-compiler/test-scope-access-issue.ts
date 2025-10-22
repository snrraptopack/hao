#!/usr/bin/env node

import { readFileSync } from 'fs'

console.log('🔍 Analyzing Scope Access Issue in Multiple Components')
console.log('=' .repeat(60))

try {
  // Read the generated output
  const output = readFileSync('test-case-5-multiple-components.js', 'utf8')
  
  console.log('🚨 SCOPE ACCESS ANALYSIS:')
  console.log('=' .repeat(40))
  
  // Find where global helpers are defined
  const globalHelpersMatch = output.match(/\/\/ Logic that was outside page scope[\s\S]*?return Component/m)
  const globalHelpersSection = globalHelpersMatch ? globalHelpersMatch[0] : ''
  
  console.log('📍 Global helpers are defined in:')
  if (globalHelpersSection.includes('export default function ProfilePage()')) {
    console.log('   ✅ Inside ProfilePage() function')
  } else {
    console.log('   ❌ Outside ProfilePage() function')
  }
  
  // Find where exported components are defined
  const userAvatarMatch = output.match(/export function UserAvatar[\s\S]*?return Component[\s\S]*?}\s*}/m)
  const themeToggleMatch = output.match(/export function ThemeToggle[\s\S]*?return Component[\s\S]*?}\s*}/m)
  
  console.log('\n📍 Exported components are defined:')
  console.log('   UserAvatar: Outside ProfilePage() function')
  console.log('   ThemeToggle: Outside ProfilePage() function')
  
  // Check for variable references
  console.log('\n🔍 Variable Reference Analysis:')
  
  const userAvatarCode = userAvatarMatch ? userAvatarMatch[0] : ''
  const themeToggleCode = themeToggleMatch ? themeToggleMatch[0] : ''
  
  // Check if UserAvatar references global variables
  const userAvatarReferencesUser = userAvatarCode.includes('user.value') || userAvatarCode.includes('user')
  const userAvatarReferencesTheme = userAvatarCode.includes('theme.value') || userAvatarCode.includes('theme')
  
  console.log('   UserAvatar references:')
  console.log(\`     - user: \${userAvatarReferencesUser ? '❌ YES (will cause error)' : '✅ NO'}\`)
  console.log(\`     - theme: \${userAvatarReferencesTheme ? '❌ YES (will cause error)' : '✅ NO'}\`)
  
  // Check if ThemeToggle references global variables
  const themeToggleReferencesUser = themeToggleCode.includes('user.value') || themeToggleCode.includes('user')
  const themeToggleReferencesTheme = themeToggleCode.includes('theme.value') || themeToggleCode.includes('theme')
  const themeToggleReferencesToggleTheme = themeToggleCode.includes('toggleTheme')
  
  console.log('   ThemeToggle references:')
  console.log(\`     - user: \${themeToggleReferencesUser ? '❌ YES (will cause error)' : '✅ NO'}\`)
  console.log(\`     - theme: \${themeToggleReferencesTheme ? '❌ YES (will cause error)' : '✅ NO'}\`)
  console.log(\`     - toggleTheme: \${themeToggleReferencesToggleTheme ? '❌ YES (will cause error)' : '✅ NO'}\`)
  
  // Overall assessment
  const hasReferenceErrors = userAvatarReferencesUser || userAvatarReferencesTheme || 
                            themeToggleReferencesUser || themeToggleReferencesTheme || 
                            themeToggleReferencesToggleTheme
  
  console.log('\n🎯 OVERALL ASSESSMENT:')
  if (hasReferenceErrors) {
    console.log('❌ REFERENCE ERRORS DETECTED!')
    console.log('   Exported components reference variables that are scoped inside ProfilePage()')
    console.log('   This will cause "ReferenceError: variable is not defined" at runtime')
    console.log('')
    console.log('💡 SOLUTION NEEDED:')
    console.log('   For @page files with multiple components, global helpers should be:')
    console.log('   1. Placed at module level (accessible to all components), OR')
    console.log('   2. Passed as props to exported components, OR') 
    console.log('   3. Exported components should be defined inside the page function')
  } else {
    console.log('✅ NO REFERENCE ERRORS DETECTED')
    console.log('   All variable references appear to be properly scoped')
  }
  
} catch (error) {
  console.error('❌ Error:', error)
}