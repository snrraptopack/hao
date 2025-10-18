import { parseTemplate } from '../compiler/parser';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the Counter.html example
const htmlPath = join(__dirname, '../examples/Counter.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

console.log('🔍 Testing Template Parser...\n');

// Parse the template
const result = parseTemplate(htmlContent);

console.log('✅ Parsed Template:');
console.log('-------------------');
console.log('Template HTML:');
console.log(result.template);
console.log('\n📦 State:');
console.log('\n⚡ Methods:');
console.log('\n✅ Parser test complete!');
