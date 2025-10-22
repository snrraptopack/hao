#!/usr/bin/env bun

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseTSXFile, generateAuwlaFromTSX } from '../src/tsx-compiler'

const inputDir = join(__dirname, 'input')
const outputDir = join(__dirname, 'output-v2')

console.log('🧪 Running TSX Compiler Tests')
console.log('=' .repeat(50))

try {
  const inputFiles = readdirSync(inputDir).filter(file => file.endsWith('.tsx'))
  
  for (const inputFile of inputFiles) {
    const inputPath = join(inputDir, inputFile)
    const outputFile = inputFile.replace('.tsx', '.ts')
    const outputPath = join(outputDir, outputFile)
    
    console.log(`\n📝 Processing: ${inputFile}`)
    console.log('-'.repeat(30))
    
    // Read input
    const content = readFileSync(inputPath, 'utf-8')
    
    // Parse
    const parsed = parseTSXFile(content)
    console.log(`✓ Parsed component: ${parsed.name}`)
    console.log(`  - Component scope: ${parsed.componentScopeCode.length} lines`)
    console.log(`  - UI scope: ${parsed.uiScopeCode.length} lines`)
    console.log(`  - Metadata: ${Object.keys(parsed.metadata).join(', ')}`)
    
    // Generate
    const generated = generateAuwlaFromTSX(parsed)
    
    // Write output
    writeFileSync(outputPath, generated, 'utf-8')
    console.log(`✓ Generated: ${outputFile}`)
    
    // Show a preview
    const lines = generated.split('\n')
    console.log(`\n📋 Preview (first 15 lines):`)
    lines.slice(0, 15).forEach((line, i) => {
      console.log(`${String(i + 1).padStart(2)}: ${line}`)
    })
    
    if (lines.length > 15) {
      console.log(`... (${lines.length - 15} more lines)`)
    }
  }
  
  console.log(`\n🎉 Processed ${inputFiles.length} test files successfully!`)
  console.log(`📁 Output files saved to: ${outputDir}`)
  
} catch (error) {
  console.error('❌ Test failed:', error)
  process.exit(1)
}