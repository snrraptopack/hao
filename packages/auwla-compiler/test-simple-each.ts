import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'
import { readFileSync } from 'fs'

console.log('🧪 Testing simple-each compilation...')

try {
  const content = readFileSync('tsx-tests/input/10-simple-each.tsx', 'utf-8')
  const parsed = parseTSXFile(content)
  const result = generateAuwlaFromTSX(parsed)
  console.log('✅ Compilation successful!')
  console.log('Generated code:')
  console.log(result)
} catch (error) {
  console.error('❌ Error:', error)
}