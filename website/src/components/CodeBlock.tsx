import { h } from 'auwla'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
import 'prismjs/plugins/line-numbers/prism-line-numbers.js'

type CodeBlockProps = {
  code: string
  language?: string
  filename?: string
  className?: string
  lineNumbers?: boolean
  wrapToggle?: boolean
}

export function CodeBlock({ code, language = 'tsx', filename, className = '', lineNumbers = true, wrapToggle = true }: CodeBlockProps) {
  // Produce highlighted HTML at render time to avoid lifecycle hooks
  const grammar = (Prism as any).languages?.[language] ?? (Prism as any).languages.markup
  const html = (Prism as any).highlight(code, grammar, language)

  const onCopy = async () => {
    try { await navigator.clipboard.writeText(code) } catch {}
  }

  let preEl: HTMLElement | null = null
  const toggleWrap = () => {
    if (preEl) preEl.classList.toggle('wrapped')
  }

  return (
    <div class={`relative ${className}`}>
      {filename && (
        <div class="text-[11px] text-gray-500 mb-1 select-none">{filename}</div>
      )}
      <div class="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white uppercase tracking-wider select-none">{language}</div>
      <pre ref={(el: any) => { preEl = el }} class={`docs-code language-${language} ${lineNumbers ? 'line-numbers' : ''} w-full overflow-x-auto`} tabIndex={0}>
        <code class={`language-${language}`} innerHTML={html}></code>
      </pre>
      <button
        class="absolute top-2 right-2 px-2 py-1 text-[12px] rounded border border-gray-300 bg-white/85 hover:bg-white shadow-sm"
        onClick={onCopy}
      >
        Copy
      </button>
      {wrapToggle && (
        <button
          class="absolute top-2 right-16 px-2 py-1 text-[12px] rounded border border-gray-300 bg-white/85 hover:bg-white shadow-sm"
          onClick={toggleWrap}
        >
          Wrap
        </button>
      )}
    </div>
  ) as HTMLElement
}
