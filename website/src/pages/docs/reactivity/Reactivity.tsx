import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsReactivity() {
  return (
    <section class="docs-prose">
      <h1>Reactivity Introduction</h1>
      <p>
        Auwla uses lightweight refs and fine‑grained watchers to update the DOM directly.
        Components do not re‑render; instead, the specific text nodes, attributes, and styles
        that depend on state are updated in place. This keeps UI stable, predictable, and fast.
      </p>

      <h2>Design Goals</h2>
      <ul>
        <li>Predictable updates with explicit data flow, no component re-renders.</li>
        <li>Fine-grained DOM diffs: only affected nodes/attributes change.</li>
        <li>Lifecycle-scoped effects with automatic cleanup when components unmount.</li>
        <li>Lean runtime: prefer simple primitives over complex abstractions.</li>
        <li>Opt-in reactivity: you decide what updates, nothing is reactive by default.</li>
      </ul>

      <h2>Core Model</h2>
      <ul>
        <li><code>ref&lt;T&gt;()</code> creates a mutable value holder accessed via <code>.value</code>.</li>
        <li><code>watch()</code> wires a value to a DOM sink (text, attribute, class, style, etc.).</li>
        <li>JSX accepts refs in children and attributes; updates are propagated without re-rendering.</li>
      </ul>

      <CodeBlock filename="Counter.tsx" code={`import { h, ref } from 'auwla'

export function Counter() {
  const count = ref(0)
  return (
    <button class=\"px-3 py-2 rounded bg-indigo-600 text-white\" onClick={() => count.value++}>
      Count: {count}
    </button>
  ) as HTMLElement
}`} />

      <p>
        The <code>Count: {`{count}`}</code> text node is bound to the ref. When <code>count.value</code> changes,
        only that text node updates. The button itself does not re-render.
      </p>

      <h2>How Updates Flow</h2>
      <ul>
        <li>When a component renders, any <code>watch()</code> or reactive sinks are scoped to its lifecycle.</li>
        <li>On <code>ref.value</code> change, only the bound sinks update (text, attributes, classes, styles).</li>
        <li>Unmounting a component tears down its watchers automatically to avoid leaks.</li>
      </ul>

      <h2>Why This Design</h2>
      <ul>
        <li>Stability: no diffing of component output, fewer surprises and layout shifts.</li>
        <li>Performance: skip virtual DOM and reconciliation; update exactly what changed.</li>
        <li>Simplicity: a small, explicit set of primitives that are easy to reason about.</li>
      </ul>

      <h2>What We Avoid</h2>
      <ul>
        <li>Implicit global reactivity or hidden re-renders.</li>
        <li>Overly magical data binding — reactivity is opt-in and explicit.</li>
        <li>Heavy dependency graphs; effects are scoped and disposable.</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>Learn how to wire complex UI with <Link to="/docs/state-management" text="State Management" />.</li>
        <li>See control primitives in <Link to="/docs/control-flow" text="Control Flow" />.</li>
      </ul>
    </section>
  ) as HTMLElement
}