import { h } from 'auwla'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'

type CodeBlockProps = {
  code: string
  language?: string
  filename?: string
  className?: string
}

export function CodeBlock({ code, language = 'tsx', filename, className = '' }: CodeBlockProps) {
  // Produce highlighted HTML at render time to avoid lifecycle hooks
  const grammar = (Prism as any).languages?.[language] ?? (Prism as any).languages.markup
  const html = (Prism as any).highlight(code, grammar, language)

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(code) } catch {}
  }

  return (
    <div class={`relative ${className}`}>
      {filename && (
        <div class="text-[11px] text-gray-500 mb-1 select-none">{filename}</div>
      )}
      <pre class={`docs-code language-${language}`} tabIndex={0}>
        {/* Auwla classic JSX supports setting innerHTML directly on elements */}
        <code class={`language-${language}`} innerHTML={html}></code>
      </pre>
      <button
        class="absolute top-2 right-2 px-2 py-1 text-[12px] rounded border border-gray-300 bg-white/80 hover:bg-white shadow-sm"
        onClick={onCopy}
      >
        Copy
      </button>
    </div>
  ) as HTMLElement
}