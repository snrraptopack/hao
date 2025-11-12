import { h } from 'auwla'

export function DocsFullstack() {
  return (
    <section class="docs-prose">
      <h1>Fullstack Plugin</h1>
      <p>Connect frontend and backend with a type‑safe API client injected via Auwla plugins.</p>
      <h2>Setup</h2>
      <pre><code>{`import { fullstackPlugin, definePage } from 'auwla'
import { $api } from '@/server/client-api'

export const Page = definePage(
  (ctx) => {
    const res = ctx.$api.user.get({ id: '1' })
    return <div>User: {res.data.value?.name}</div>
  },
  [fullstackPlugin($api)]
)`}</code></pre>
      <h2>Patterns</h2>
      <ul class="list-disc pl-6">
        <li>Inject a shared client via layout for all child pages.</li>
        <li>Use with resources and derive for reactive data.</li>
        <li>Handle errors with page‑level boundaries and devtools.</li>
      </ul>
    </section>
  ) as HTMLElement
}

