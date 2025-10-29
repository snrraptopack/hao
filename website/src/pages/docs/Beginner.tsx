import { h } from 'auwla'

export function DocsBeginner() {
  return (
    <section class="docs-prose">
      <h1>Beginner Guide</h1>
      <p>Start here to learn the basics of Auwla—JSX, components, and routing. Short, practical steps to get productive quickly.</p>
      <h2>Core ideas</h2>
      <ul class="list-disc pl-6">
        <li>Use <code>h</code> to create elements with familiar JSX.</li>
        <li>Manage state with <code>ref()</code> and react to changes with <code>watch()</code>.</li>
        <li>Navigate with the built-in router and simple route definitions.</li>
      </ul>
    </section>
  ) as HTMLElement
}