import { join, dirname } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { docCategories } from '../utils/navigation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const docsDir = join(projectRoot, 'docs');
const outputDir = join(projectRoot, 'public');
const outputPath = join(outputDir, 'llm.txt');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

let concatenatedContent = `========================================================================
AUWLA FRAMEWORK DOCUMENTATION (LLM CONTEXT)
Generated: ${new Date().toISOString()}
========================================================================\n\n`;

for (const category of docCategories) {
  concatenatedContent += `\n\n========================================================================
CATEGORY: ${category.title.toUpperCase()}
========================================================================\n`;

  for (const link of category.links) {
    const slug = link.slug;
    const label = link.label;
    const filePath = join(docsDir, `${slug}.md`);

    try {
      let content = readFileSync(filePath, 'utf-8');
      
      // Clean up headers tags if they exist
      content = content.replace(/=<Header>[\s\S]*?<\/Header>/g, '');
      content = content.replace(/=<Header>[\s\S]*?=\<\/Header\>/g, '');
      
      concatenatedContent += `\n\n------------------------------------------------------------------------
DOCUMENT: ${label} (${slug}.md)
------------------------------------------------------------------------\n\n`;
      concatenatedContent += content.trim() + '\n';
    } catch (error) {
      console.warn(`Warning: Could not read documentation file for slug "${slug}" at ${filePath}`);
    }
  }
}

writeFileSync(outputPath, concatenatedContent, 'utf-8');
console.log(`Successfully generated combined LLM context at ${outputPath}`);
