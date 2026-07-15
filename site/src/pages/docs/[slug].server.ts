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

  return html;
});
