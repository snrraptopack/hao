import { parseTemplate } from '../compiler/parser';
import { analyzeTemplate } from '../compiler/analyzer';
import { generateCode } from '../compiler/codegen';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const templatePath = resolve(__dirname, '../examples/TodoList.html');
const outputPath = resolve(__dirname, '../examples/TodoList.compiled.js');

console.log('🚀 Testing TodoList Template Compiler...\n');

const htmlContent = readFileSync(templatePath, 'utf-8');

console.log('📄 Input Template:');
console.log('==================');
console.log(htmlContent);
console.log('\n');

// Parse
const { script, template } = parseTemplate(htmlContent);

// Analyze
const nodes = analyzeTemplate(template);

// Generate
const compiledCode = generateCode(nodes, script);

console.log('⚡ Compiled Output:');
console.log('===================');
console.log(compiledCode);
console.log('\n');

// Save to file
writeFileSync(outputPath, compiledCode);
console.log(`✅ Compiled code saved to: ${outputPath}\n`);
console.log('🎉 Compilation successful!');
