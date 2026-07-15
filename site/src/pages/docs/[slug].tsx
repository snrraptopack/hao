import { getRouted, type RouteContext } from 'auwla/router';
import { track } from 'auwla/track';
import { getDocHtml } from './[slug].server';


type State = {
  html: string
  title: string
}

export async function routed(ctx: RouteContext<any, State>, signal: AbortSignal) {
  let html = ctx.state.html
  if (html) return { html, title: ctx.state.title }
  const result = await track.get(getDocHtml, { signal });
  ctx.state.html = result.html
  ctx.state.title = result.title
  return result
}

// we have a global pending and error component configured in the main.tsx

export default function DocPage() {
  const loader = getRouted(routed);
  const data = loader?.value;
  const html = data?.html || '';
  const title = data?.title || 'Documentation';
  let isCopied = false;

  const handleCopy = () => {
    const article = document.querySelector('.doc-content');
    if (article) {
      const text = (article as HTMLElement).innerText;
      navigator.clipboard.writeText(text);
      isCopied = true;
      setTimeout(() => { isCopied = false; }, 2000);
    }
  };

  return () => (
    <div class="relative w-full">
      <head>
        <title>Auwla - {title}</title>
        <meta name="description" content={`Auwla documentation: ${title}`} />
      </head>

      <div class="absolute right-0 top-0 flex items-center gap-2 z-10">
        <button
          onClick={handleCopy}
          class="text-xs text-slate-500 hover:text-black font-medium border border-slate-200/80 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            {isCopied ? (
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            ) : (
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            )}
          </svg>
          <span>{isCopied ? 'Copied!' : 'Copy Page'}</span>
        </button>
      </div>

      <article
        class="doc-content max-w-4xl py-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
