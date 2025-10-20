import { parseAuwlaFile } from './packages/auwla-compiler/dist/auwla-parser.js';
import { generateAuwlaFile } from './packages/auwla-compiler/dist/index.js';
import fs from 'fs';

// Test with blog-post.auwla file
const auwlaContent = fs.readFileSync('./starter-template/src/pages/blog-post.auwla', 'utf8');
console.log('Testing blog-post.auwla compilation after Fragment fix...');

try {
  const parsed = parseAuwlaFile(auwlaContent);
  console.log('✅ Parsed successfully!');
  
  const generated = generateAuwlaFile(parsed);
  console.log('✅ Generated successfully!');
  
  console.log('Generated imports:');
  const importLines = generated.split('\n').filter(line => line.startsWith('import'));
  importLines.forEach(line => console.log('  ' + line));
  
  console.log('\nContains Fragment import:', generated.includes("import { Component, LayoutBuilder, For, Fragment }"));
  console.log('Contains ui.Fragment calls:', generated.includes('ui.Fragment'));
  
  console.log('\nFirst 800 chars of generated code:');
  console.log(generated.substring(0, 800));
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}