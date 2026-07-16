import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const docsDir = './site/docs';

try {
  const files = readdirSync(docsDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} markdown files.`);

  for (const file of files) {
    const filePath = join(docsDir, file);
    const rawContent = readFileSync(filePath, 'utf-8');

    // Skip if it already has `=<Header>` frontmatter
    if (rawContent.startsWith('=<Header>')) {
      console.log(`Skipping ${file} - already has header`);
      continue;
    }

    // Extract first H1 heading
    const match = rawContent.match(/^#\s+(.+)$/m);
    let title = '';
    if (match && match[1]) {
      title = match[1].trim();
    } else {
      // Fallback to formatting filename
      title = file
        .replace('.md', '')
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    const headerBlock = `=<Header>\ntitle: ${title}\n=</Header>\n\n`;
    const newContent = headerBlock + rawContent;

    writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Added header to ${file}: "${title}"`);
  }

  console.log('✅ Finished adding headers to all docs!');
} catch (e) {
  console.error('Failed to add headers:', e);
}
