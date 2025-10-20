import { parseAuwlaFile } from './packages/auwla-compiler/dist/auwla-parser.js';
import fs from 'fs';

// Test with blog-post.auwla file
const auwlaContent = fs.readFileSync('./starter-template/src/pages/blog-post.auwla', 'utf8');
console.log('Debugging template structure...');

try {
  const parsed = parseAuwlaFile(auwlaContent);
  console.log('✅ Parsed successfully!');
  
  console.log('Parsed structure:');
  console.log('Keys:', Object.keys(parsed));
  console.log('Full parsed:', JSON.stringify(parsed, null, 2));
  
} catch (error) {
  console.error('❌ Error:', error.message);
}