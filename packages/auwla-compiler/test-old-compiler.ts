#!/usr/bin/env bun

import { readFileSync } from 'fs'
import { parseAuwlaFile, generateAuwlaFile } from './src/index.js'

console.log('🧪 Testing Old Compiler Scoping...')

const testFile = 'test-non-page.tsx'
const content = readFileSync(testFile, 'utf-8')

console.log('📄 Input TSX:')
console.log(content)
console.log('\n' + '='.repeat(60))

try {
  // Parse the file
  const parsed = parseAuwlaFile(content)
  
  console.log('📊 Parsed Structure:')
  console.log('  Metadata:', parsed.metadata)
  console.log('  Helpers (outside export default):', parsed.helpers)
  console.log('  PageHelpers (inside export default):', parsed.pageHelpers)
  console.log('  Components:', parsed.components.length)
  
  console.log('\n' + '='.repeat(60))
  
  // Generate the code
  const generated = generateAuwlaFile(parsed)
  
  console.log('📄 Generated Code:')
  console.log(generated)
  
} catch (error) {
  console.error('❌ Error:', error)
}