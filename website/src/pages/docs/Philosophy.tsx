import { h } from 'auwla'

export function DocsPhilosophy() {
  return (
    <section class="docs-prose">
      <h1>Auwla Philosophy</h1>
      <p>Auwla focuses on clarity, performance, and pragmatic innovation. It keeps the mental model simple: state is data, rendering is a pure function of that data, and updates are precise.</p>
      <h2>Design Principles</h2>
      <ul class="list-disc pl-6">
        <li>Simple reactivity: `ref`, `watch`, `derive` — no class magic, no decorators.</li>
        <li>Inline control flow: function-children give lazy, tracked conditionals in JSX.</li>
        <li>Typed composition: pages and layouts compose plugin contexts for explicit dependencies.</li>
        <li>Performance first: differential updates, keyed reconciliation, batched notifications.</li>
        <li>Dev ergonomics: helpful errors, minimal boilerplate, familiar JSX.</li>
      </ul>
      <h2>Why Function Children?</h2>
      <p>Using <code>{'() => ...'}</code> in children allows lazy evaluation and automatic dependency tracking via <code>derive()</code>. This keeps conditionals readable and performant.</p>
      <h2>Plugins Over Globals</h2>
      <p>Plugins provide explicit context for pages and layouts. This avoids hidden globals and makes dependencies visible and type‑safe.</p>
      <h2>State Approach</h2>
      <p>Prefer immutable updates and reference equality for fast diffs. Use `derive()` for computed state and `watch()`/`watchEffect()` for effects.</p>
    </section>
  ) as HTMLElement
}
