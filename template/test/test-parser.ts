import { compile } from '../compiler';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the Counter.html example
const htmlPath = join(__dirname, '../examples/Counter.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

console.log('🔍 Testing Template Compiler (auwla pipeline)...\n');

// Compile (this returns generated TypeScript source)
const ts = compile(htmlContent);

console.log('✅ Generated TypeScript:');
console.log('-------------------------');
console.log(ts);
console.log('\n✅ Compiler test complete!');
