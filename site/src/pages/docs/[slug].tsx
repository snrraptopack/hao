import { getRouted, type RouteContext } from 'auwla/router';
import { track } from 'auwla/track';
import { getDocHtml } from './[slug].server';


type State = {
  html: string
}

export async function routed(ctx: RouteContext<any, State>, signal: AbortSignal) {
  let html = ctx.state.html
  if (html) return html
  const result = await track.get(getDocHtml, { signal });
  ctx.state.html = result
  return result
}

// we have a global pending and error component configured in the main.tsx

export default function DocPage() {
  const loader = getRouted(routed);
  const html = loader?.value || ''
  return () => (
    <article
      class="doc-content max-w-3xl py-4"
      dangerouslySetInnerHTML={{ __html: html  }}
    />
  );
}
