import { getParams, getRouted, navigate, type RouteContext } from 'auwla/router'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import Prism from 'prismjs'
// Load TSX and JSX language extensions into Prism
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'


// 1. Initialize a custom Marked instance with the highlight plugin
const marked = new Marked(
  markedHighlight({
    langPrefix: 'language-', // Prism uses 'language-' prefixes
    highlight(code, lang) {
      if (Prism.languages[lang]) {
        return Prism.highlight(code, Prism.languages[lang], lang);
      }
      return code;
    }
  })
);

export const config = {
  renderMode: 'ssg',
  async generatePaths() {
    const fs = await import('node:fs')
    const path = await import('node:path')

    const docsDir = path.resolve(process.cwd(), 'docs')
    const files = fs.readdirSync(docsDir)

    return files
      .filter(f => f.endsWith('.md'))
      .map(f => ({ slug: f.replace(/\.md$/, '') }))
  }
}

/**
 * The Data Loader. 
 * This now handles BOTH fetching the text AND the heavy CPU work.
 */
export async function routed(ctx: RouteContext<'/docs/:slug'>, signal: AbortSignal) {
  const docs = import.meta.glob('@docs/*.md', { query: '?raw', import: 'default' })
  const fileKey = `/docs/${ctx.params.slug}.md`;
  const loadFile = docs[fileKey];

  if (!loadFile) {
    throw new Error(`Documentation page "${ctx.params.slug}" not found.`);
  }

  // 1. Get the raw markdown text
  const rawMarkdown = await loadFile() as string;
  const html = marked.parse(rawMarkdown)

  // 3. Return the fully computed HTML string
  return html;
}

/**
 * The UI Component.
 * Pure, lightweight, and completely unaware of marked/prism.
 */
export default function DocPage() {
  // getRouted now receives the finalized, colored HTML string!
  const finalHtml = getRouted(routed)?.value ?? '';

  return () => (
    <article
      class="doc-content max-w-3xl py-4"
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    // Boom! No `ref` needed. The HTML is already syntax-highlighted.
    />
  );
}