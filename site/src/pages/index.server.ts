import { remote } from 'auwla/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mdParser } from '../utils/markdown';

export const getHomeShowcases = remote.get(async () => {
  const counterPath = join(process.cwd(), 'snippets', 'Counter.md');
  const paintPath = join(process.cwd(), 'snippets', 'Paint.md');

  const counterRaw = readFileSync(counterPath, 'utf-8');
  const paintRaw = readFileSync(paintPath, 'utf-8');

  const counterHtml = (await mdParser.parse(counterRaw)).html;
  const paintHtml = (await mdParser.parse(paintRaw)).html;

  return {
    counterHtml,
    paintHtml
  };
});
