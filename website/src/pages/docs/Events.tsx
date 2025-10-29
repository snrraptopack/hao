import { h } from 'auwla'

export function DocsEvents() {
  return (
    <section class="docs-prose">
      <h1>Events</h1>
      <p>Handle user interaction with event listeners and fine-grained updates.</p>
      <h2>Common Patterns</h2>
      <ul class="list-disc pl-6">
        <l>Uses any event that is supported by JSX ie OnClick...</l>
        <li>Click and input handlers.</li>
        <li>Prevent default and stop propagation.</li>
        <li>Async events and loading states.</li>
      </ul>
    </section>
  ) as HTMLElement
}