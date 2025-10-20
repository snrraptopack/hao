import { parseAuwlaFile } from './auwla-parser';
import { generateAuwlaFile } from 'auwla-compiler';
import { readFileSync, writeFileSync, readdirSync } from 'fs';

console.log('='.repeat(70));
console.log('AUWLA CODE GENERATOR TEST');
console.log('='.repeat(70));

// Find all .auwla files in examples directory
const examplesDir = '../examples';
const auwlaFiles = readdirSync(examplesDir)
  .filter(file => file.endsWith('.auwla'))
  .map(file => ({
    name: file,
    path: `${examplesDir}/${file}`
  }));

// Compile each file
for (const file of auwlaFiles) {
  console.log(`\n📄 Compiling: ${file.name}`);
  console.log('-'.repeat(70));

  try {
    const content = readFileSync(file.path, 'utf8');
    const parsed = parseAuwlaFile(content);

    if (parsed.components.length === 0) {
      console.log('⚠️  No component found, skipping...');
      continue;
    }

    const compiled = generateAuwlaFile(parsed);

    console.log('\n✅ Generated Code:\n');
    console.log(compiled);

    // Save to file
    const outputPath = file.path.replace('.auwla', '.compiled.ts');
    writeFileSync(outputPath, compiled);
    console.log(`\n💾 Saved to: ${outputPath.replace(examplesDir + '/', '')}`);

  } catch (error) {
    console.error(`\n❌ Error compiling ${file.name}:`, error);
  }

  console.log('\n' + '='.repeat(70));
}

console.log('✅ Compilation Complete!');
console.log('='.repeat(70));
