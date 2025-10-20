#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { compileTSX } from './src/tsx-only-compiler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const inputDir = join(__dirname, 'tsx-tests/input')
const outputDir = join(__dirname, 'tsx-tests/output-v2')

console.log('🧪 Testing TSX-Only Compiler (using existing infrastructure)')
console.log('=' .repeat(60))

try {
  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true })
  
  const testFiles = ['01-simple-button.tsx', '02-dynamic-button.tsx', '03-mixed-elements.tsx', '04-if-syntax.tsx', '05-if-block-syntax.tsx', '06-complex-structure.tsx', '07-if-else-chain.tsx', '08-simple-if-else.tsx', '09-each-syntax.tsx', '10-simple-each.tsx', '11-reactive-map.tsx', '12-static-map.tsx', '13-component-composition.tsx']
  
  for (const inputFile of testFiles) {
    const inputPath = join(inputDir, inputFile)
    const outputFile = inputFile.replace('.tsx', '.ts')
    const outputPath = join(outputDir, outputFile)
    
    console.log(`\n📝 Processing: ${inputFile}`)
    console.log('-'.repeat(40))
    
    // Read input
    const content = readFileSync(inputPath, 'utf-8')
    console.log('✓ Read input file')
    
    // Compile using existing infrastructure
    const compiled = compileTSX(content)
    console.log('✓ Compiled using existing auwla compiler')
    
    // Write output
    writeFileSync(outputPath, compiled, 'utf-8')
    console.log(`✓ Generated: ${outputFile}`)
    
    // Show preview
    const lines = compiled.split('\n')
    console.log(`\n📋 Preview (first 20 lines):`)
    lines.slice(0, 20).forEach((line, i) => {
      console.log(`${String(i + 1).padStart(2)}: ${line}`)
    })
    
    if (lines.length > 20) {
      console.log(`... (${lines.length - 20} more lines)`)
    }
  }
  
  console.log(`\n🎉 Successfully compiled ${testFiles.length} TSX files!`)
  console.log(`📁 Output saved to: ${outputDir}`)
  console.log('\n💡 This approach leverages the existing auwla compiler infrastructure')
  console.log('   instead of reimplementing JSX analysis and code generation.')
  
} catch (error) {
  console.error('❌ Compilation failed:', error)
  process.exit(1)
}