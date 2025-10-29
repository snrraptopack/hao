import { h } from 'auwla'

export function DocsJSXGuide() {
  return (
    <section class="docs-prose">
      <h1>JSX Guide</h1>
      <p>How JSX maps to Auwla’s element creation, and practical patterns for composition.</p>
      <h2>Essentials</h2>
      <ul class="list-disc pl-6">
        <li>JSX compiles to <code>h()</code> calls with predictable behavior.</li>
        <li>Props map directly to element attributes and event handlers.</li>
        <li>Use small components; avoid prop drilling with context.</li>
      </ul>
    </section>
  ) as HTMLElement
}