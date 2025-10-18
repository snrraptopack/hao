import { compile } from '../compiler/index';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Testing Full Template Compiler...\n');

// Read the Counter.html example
const htmlPath = join(__dirname, '../examples/Counter.html');
const htmlContent = readFileSync(htmlPath, 'utf-8');

console.log('📄 Input Template:');
console.log('==================');
console.log(htmlContent);
console.log('\n');

// Compile the template
const compiledCode = compile(htmlContent);

console.log('⚡ Compiled Output:');
console.log('===================');
console.log(compiledCode);

// Save to file for inspection
const outputPath = join(__dirname, '../examples/Counter.compiled.js');
writeFileSync(outputPath, compiledCode, 'utf-8');

console.log(`\n✅ Compiled code saved to: ${outputPath}`);
console.log('\n🎉 Compilation successful!');
