import { getParams, getRouted, navigate, type RouteContext } from 'auwla/router'
import { marked } from 'marked'
import Prism from 'prismjs'
// Load TSX and JSX language extensions into Prism
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'

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
  const loader = getRouted(routed)
  const rawText = loader?.value ?? '';
  const htmlContent = marked.parse(rawText) as string;

  return () => (
    <article
      class="doc-content max-w-3xl py-4"
      ref={(el) => {
        el.innerHTML = htmlContent;
        Prism.highlightAllUnder(el);
      }}
    />
  );
}
