/**
 * Scans a Markdown content string and extracts all headings (level 1-6)
 * to populate the table of contents. Supports both standard # headers and custom tag-based headings (=<h1>...=</h1>).
 */
export function extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 1. Match custom single-line tag headings, e.g. =<h1>Getting Started=</h1>
    const tagMatch = trimmed.match(/^=<h([1-6])(?:[^>]*?)>(.*?)=<\/h\1>$/);
    if (tagMatch) {
      const level = parseInt(tagMatch[1]!, 10);
      const text = tagMatch[2]!.trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ level, text, id });
      continue;
    }

    // 2. Match standard markdown headings, e.g. # Title
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1]!.length;
      const text = match[2]!.trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ level, text, id });
    }
  }

  return headings;
}
