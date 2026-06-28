/**
 * Parses header-based metadata blocks (e.g. key: value lines enclosed within =<Header> ... =</Header> tags)
 * at the top of a Markdown document and removes them from the parsed content body.
 */
export function extractFrontmatter(rawString: string): { content: string; meta: Record<string, any> } {
  const match = rawString.match(/^=<Header(?:[^>]*)>\r?\n([\s\S]*?)\r?\n=<\/Header>\r?\n([\s\S]*)$/);
  if (!match) return { content: rawString, meta: {} };

  const rawMeta = match[1]!;
  const content = match[2]!;
  const meta: Record<string, any> = {};

  for (const line of rawMeta.split('\n')) {
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const val = line.slice(sep + 1).trim();

    if (val === 'true') {
      meta[key] = true;
    } else if (val === 'false') {
      meta[key] = false;
    } else if (!isNaN(Number(val)) && val !== '') {
      meta[key] = Number(val);
    } else {
      meta[key] = val.replace(/^["']|["']$/g, ''); // strip optional wrapping quotes
    }
  }

  return { content, meta };
}
