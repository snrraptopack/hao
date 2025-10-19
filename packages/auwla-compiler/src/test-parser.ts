import { parseAuwlaFile } from './auwla-parser';
import { readFileSync } from 'fs';

// Test the parser
const content = readFileSync('./template/examples/Hello.auwla', 'utf8');
const result = parseAuwlaFile(content);

console.log('Parsed Auwla File:');
console.log('==================');
console.log('\nImports:', result.imports);
console.log('\nTypes:', result.types);
console.log('\nHelpers:', result.helpers);
console.log('\nComponents:', result.components.map(c => ({
  name: c.name,
  isExported: c.isExported,
  isDefault: c.isDefault,
  paramCount: c.params.length
})));
