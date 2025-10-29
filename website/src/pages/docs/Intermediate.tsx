import { h } from 'auwla'

export function DocsIntermediate() {
  return (
    <section class="docs-prose">
      <h1>Intermediate Guide</h1>
      <p>Dive deeper into patterns for components, derived state, and composition. This is where your app starts to scale.</p>
      <h2>What you’ll learn</h2>
      <ul class="list-disc pl-6">
        <li>Compose components with clear state boundaries.</li>
        <li>Use derived state to avoid unnecessary recomputation.</li>
        <li>Organize routes and layouts for multi‑page apps.</li>
      </ul>
    </section>
  ) as HTMLElement
}