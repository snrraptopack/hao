import { parseAuwlaFile } from './src/auwla-parser';
import { generateAuwlaFile } from './src/codegen/main';
import { readFileSync } from 'fs';

console.log('='.repeat(70));
console.log('STARTER TEMPLATE COMPILATION TEST');
console.log('='.repeat(70));

const filePath = '../../starter-template/src/pages/about.auwla';

try {
  console.log(`\n📄 Compiling: ${filePath}`);
  console.log('-'.repeat(70));
  
  const content = readFileSync(filePath, 'utf8');
  const parsed = parseAuwlaFile(content);
  
  console.log('\n🔍 Parsed Structure:');
  console.log('- Imports:', parsed.imports.length);
  console.log('- Page Helpers:', parsed.pageHelpers.length);
  console.log('- Components:', parsed.components.length);
  console.log('- Global Helpers:', parsed.helpers.length);
  
  if (parsed.components.length === 0) {
    console.log('⚠️  No component found, skipping...');
  } else {
    const compiled = generateAuwlaFile(parsed);
    
    console.log('\n✅ Generated Code:\n');
    console.log(compiled);
  }
  
} catch (error) {
  console.error(`\n❌ Error compiling:`, error);
}

console.log('\n' + '='.repeat(70));
console.log('✅ Test Complete!');
console.log('='.repeat(70));