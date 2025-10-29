import { h } from 'auwla'

export function DocsAPIReference() {
  return (
    <section class="docs-prose">
      <h1>API Reference</h1>
      <p>Concise, copy‑pasteable API docs for core modules: state, lifecycle, routing, and data fetching.</p>
      <h2>Modules</h2>
      <ul class="list-disc pl-6">
        <li><code>state</code>: <code>ref()</code>, <code>watch()</code>, <code>flush()</code>.</li>
        <li><code>router</code>: <code>Router</code>, <code>Link</code>, <code>useParams()</code>, <code>useQuery()</code>.</li>
        <li><code>routes</code>: <code>defineRoutes()</code>, <code>group()</code>, <code>composeRoutes()</code>, <code>pathFor()</code>.</li>
      </ul>
    </section>
  ) as HTMLElement
}