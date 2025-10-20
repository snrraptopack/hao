#!/usr/bin/env bun

import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '@babel/parser'

// Validate the generated TypeScript code
const outputFile = join(__dirname, '../../starter-template/src/test-compiled-component.ts')

try {
  console.log('🔍 Validating generated TypeScript code...')
  const content = readFileSync(outputFile, 'utf-8')
  
  // Parse with TypeScript parser to check syntax
  const ast = parse(content, {
    sourceType: 'module',
    plugins: ['typescript']
  })
  
  console.log('✅ Generated code has valid TypeScript syntax!')
  console.log(`📊 AST contains ${ast.body?.length || 0} top-level statements`)
  
  // Check for common issues
  const issues: string[] = []
  
  if (content.includes('ui.Text({ value: `')) {
    const templateLiteralCount = (content.match(/ui\.Text\({ value: `/g) || []).length
    console.log(`📝 Found ${templateLiteralCount} template literal expressions`)
  }
  
  if (content.includes('watch([')) {
    const watchCount = (content.match(/watch\(\[/g) || []).length
    console.log(`⚡ Found ${watchCount} reactive watch expressions`)
  }
  
  if (content.includes('on: { click:')) {
    const eventCount = (content.match(/on: \{ click:/g) || []).length
    console.log(`🖱️ Found ${eventCount} click event handlers`)
  }
  
  // Check for potential issues
  if (content.includes('.value.value')) {
    issues.push('Double .value access detected - may cause runtime errors')
  }
  
  if (content.includes('ui.Text({ value: undefined')) {
    issues.push('Undefined values passed to ui.Text')
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️ Potential issues found:')
    issues.forEach(issue => console.log(`  - ${issue}`))
  } else {
    console.log('\n🎉 No obvious issues detected!')
  }
  
  console.log('\n📋 Generated code preview (first 10 lines):')
  const lines = content.split('\n')
  lines.slice(0, 10).forEach((line, i) => {
    console.log(`${String(i + 1).padStart(2)}: ${line}`)
  })
  
  if (lines.length > 10) {
    console.log(`... (${lines.length - 10} more lines)`)
  }
  
} catch (error) {
  console.error('❌ Validation failed:', error)
  process.exit(1)
}