import { h } from 'auwla'

export function DocsStyling() {
  return (
    <section class="docs-prose">
      <h1>Styling</h1>
      <p>Use utilities, component classes, and modern CSS to style your UI.</p>
      <h2>Options</h2>
      <ul class="list-disc pl-6">
        <li>Tailwind utilities for rapid styling.</li>
        <li>Scoped component classes.</li>
        <li>Global styles and design tokens.</li>
      </ul>
    </section>
  ) as HTMLElement
}