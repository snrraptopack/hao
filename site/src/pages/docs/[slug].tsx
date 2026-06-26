import { getParams, getRouted, navigate, type RouteContext } from 'auwla/router'
import { marked } from 'marked'
import Prism from 'prismjs'
// Load TSX and JSX language extensions into Prism
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'

declare const __ssrBlock: (fn: () => string) => any;


export const config = {
  renderMode: 'ssg',
  async generatePaths() {
    const fs = await import('node:fs')
    const path = await import('node:path')

    // Read the docs directory at build time
    const docsDir = path.resolve(process.cwd(), 'docs')
    const files = fs.readdirSync(docsDir)

    // Map each markdown filename (e.g. 'introduction.md') to a route parameter
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => ({ slug: f.replace(/\.md$/, '') }))
  }
}

/**
 * Dynamic route loader. Awaits glob import of raw markdown text.
 * Navigating away will automatically abort any in-flight loaders.
 */
export async function routed(ctx: RouteContext<'/docs/:slug'>, signal: AbortSignal) {
  // Scans for markdown files under site/docs/
  const docs = import.meta.glob('@docs/*.md', { query: '?raw', import: 'default' })
  const fileKey = `/docs/${ctx.params.slug}.md`; // dont use "@" here
  const loadFile = docs[fileKey];

  if (!loadFile) {
    throw new Error(`Documentation page "${ctx.params.slug}" not found.`);
  }

  return await loadFile();
}


export default function DocPage() {
  return () => (
    <article
      class="doc-content max-w-3xl py-4"
      ref={(el) => {
        const val = getRouted(routed)?.value;
        if (val) {
          el.innerHTML = marked.parse(val) as string;
          Prism.highlightAllUnder(el);
        }
      }}
    >
      {typeof document === 'undefined'
        ? __ssrBlock(() => marked.parse(getRouted(routed)?.value ?? '') as string)
        : null}
    </article>
  );
}
