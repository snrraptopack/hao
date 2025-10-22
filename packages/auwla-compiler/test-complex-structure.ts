import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing complex-structure compilation...');

try {
  const content = readFileSync(join(__dirname, 'tsx-tests/input/06-complex-structure.tsx'), 'utf-8');
  const parsed = parseTSXFile(content)
  const result = generateAuwlaFromTSX(parsed)
  console.log('✅ Compilation successful!')
  console.log('Generated code:')
  console.log(result)
} catch (error) {
  console.error('❌ Error:', error)
}