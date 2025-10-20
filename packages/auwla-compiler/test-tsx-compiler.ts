#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

// Test the TSX compiler with the comprehensive test file
const testFile = join(__dirname, 'comprehensive-test.tsx')
const outputFile = join(__dirname, 'test-output.ts')

try {
  console.log('🔍 Reading TSX file:', testFile)
  const content = readFileSync(testFile, 'utf-8')
  
  console.log('📝 Original TSX content:')
  console.log('=' .repeat(50))
  console.log(content)
  console.log('=' .repeat(50))
  
  console.log('\n🔄 Parsing TSX...')
  const parsed = parseTSXFile(content)
  
  console.log('📊 Parsed structure:')
  console.log('- Component name:', parsed.name)
  console.log('- Is default export:', parsed.isDefault)
  console.log('- Metadata:', parsed.metadata)
  console.log('- Imports:', parsed.imports.length)
  console.log('- Component scope code:', parsed.componentScopeCode.length, 'lines')
  console.log('- UI scope code:', parsed.uiScopeCode.length, 'lines')
  console.log('- JSX content length:', parsed.jsxContent.length, 'chars')
  
  console.log('\n📋 Component scope code:')
  parsed.componentScopeCode.forEach((line, i) => {
    console.log(`  ${i + 1}: ${line}`)
  })
  
  console.log('\n📋 UI scope code:')
  parsed.uiScopeCode.forEach((line, i) => {
    console.log(`  ${i + 1}: ${line}`)
  })
  
  console.log('\n📋 JSX content:')
  console.log(parsed.jsxContent)
  
  console.log('\n⚡ Generating Auwla code...')
  const generated = generateAuwlaFromTSX(parsed)
  
  console.log('\n✨ Generated Auwla code:')
  console.log('=' .repeat(50))
  console.log(generated)
  console.log('=' .repeat(50))
  
  // Write output for inspection
  writeFileSync(outputFile, generated, 'utf-8')
  console.log(`\n💾 Output written to: ${outputFile}`)
  
  console.log('\n✅ TSX compilation completed successfully!')
  
} catch (error) {
  console.error('❌ Error during TSX compilation:', error)
  process.exit(1)
}