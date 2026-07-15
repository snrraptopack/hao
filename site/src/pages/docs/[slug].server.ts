import { remote, getParams, getContext, NotFoundError } from 'auwla/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mdParser } from '../../utils/markdown';

export const getDocHtml = remote.get(async () => {
  const { slug } = getParams()

  const filePath = join(process.cwd(), 'docs', `${slug}.md`);
  console.log(filePath)

  if (!existsSync(filePath)) {
    throw new NotFoundError(`Documentation page "${slug}" not found.`);
  }

  const rawMarkdown = readFileSync(filePath, 'utf-8');
  const { html } = await mdParser.parse(rawMarkdown);

  // Extract title from slug or markdown header
  let title = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const match = rawMarkdown.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    title = match[1].trim();
  }

  return { html, title };
});
