import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsListRendering() {
  return (
    <section class="docs-prose">
      <h1>List Rendering with For</h1>
      <p>
        Render dynamic lists efficiently with <code>For</code>. It keeps DOM nodes stable, applies keyed reconciliation,
        and updates only what changed. This avoids component re-renders and preserves focus, selection, and animations.
      </p>

      <h2>Why For</h2>
      <ul>
        <li>Keyed reconciliation moves existing nodes instead of recreating them.</li>
        <li>Stable identity prevents losing input focus or scroll positions.</li>
        <li>Minimal DOM churn improves performance and predictability.</li>
        <li>Explicit: you control the array and its updates, nothing is implicit.</li>
      </ul>

      <h2>Basic Usage</h2>
      <p>
        Provide an array as a <code>Ref&lt;T[]&gt;</code> via <code>each</code>, a <code>key</code> function (prefer a unique ID),
        and a render function via children or <code>render</code>.
      </p>

      <CodeBlock filename="ForBasic.tsx" code={`import { h, ref } from 'auwla'
import { For } from 'auwla'

type Todo = { id: number; title: string; done: boolean }

export function TodoList() {
  const todos = ref<Todo[]>([
    { id: 1, title: 'Buy milk', done: false },
    { id: 2, title: 'Write docs', done: true },
  ])

  return (
    <ul class=\"space-y-1\">
      <For each={todos} key={(t) => t.id}>
        {(todo) => (
          <li class={todo.done ? 'line-through text-gray-500' : ''}>{todo.title}</li>
        )}
      </For>
    </ul>
  ) as HTMLElement
}`} />

      <h2>Render Prop Alternative</h2>
      <p>
        If you prefer a prop, use <code>render</code> instead of a child function.
      </p>
      <CodeBlock filename="ForRenderProp.tsx" code={`import { h, ref } from 'auwla'
import { For } from 'auwla'

export function Users() {
  const users = ref([{ id: 'u1', name: 'Ada' }, { id: 'u2', name: 'Linus' }])
  return (
    <ul>
      <For each={users} key={(u) => u.id} render={(u) => <li>{u.name}</li>} />
    </ul>
  ) as HTMLElement
}`} />

      <h2>Reactive Updates</h2>
      <p>
        Auwla’s reactivity is shallow. Mutating the array in place won’t notify watchers.
        Replace the array reference to trigger updates.
      </p>
      <CodeBlock filename="ForReactiveUpdates.tsx" code={`import { h, ref } from 'auwla'
import { For } from 'auwla'

export function Items() {
  const items = ref([1, 2])

  function add() {
    //  no update: items.value.push(3)
    //  update: replace the array reference
    items.value = [...items.value, 3]
  }

  function removeFirst() {
    items.value = items.value.slice(1)
  }

  return (
    <div>
      <button class=\"px-2 py-1 border rounded mr-2\" onClick={add}>Add</button>
      <button class=\"px-2 py-1 border rounded\" onClick={removeFirst}>Remove first</button>
      <ul class=\"mt-2\">
        <For each={items} render={(n) => <li>#{n}</li>} />
      </ul>
    </div>
  ) as HTMLElement
}`} />

      <h2>Reorder and Keys</h2>
      <p>
        Use a stable <code>key</code> (like an ID). On reorder, <code>For</code> moves existing nodes instead of recreating,
        preserving input focus and any local state inside items.
      </p>
      <CodeBlock filename="ForReorder.tsx" code={`import { h, ref } from 'auwla'
import { For } from 'auwla'

type Row = { id: string; value: string }

export function ReorderDemo() {
  const rows = ref<Row[]>([
    { id: 'a', value: 'Alpha' },
    { id: 'b', value: 'Beta' },
    { id: 'c', value: 'Gamma' },
  ])

  function shuffle() {
    rows.value = [...rows.value].sort(() => Math.random() - 0.5)
  }

  return (
    <div>
      <button class=\"px-2 py-1 border rounded\" onClick={shuffle}>Shuffle</button>
      <ul class=\"mt-2 space-y-1\">
        <For each={rows} key={(r) => r.id}>
          {(r) => <li class=\"px-2 py-1 border rounded\">{r.value}</li>}
        </For>
      </ul>
    </div>
  ) as HTMLElement
}`} />

      <h2>Conditional Inside For</h2>
      <p>
        Combine <code>For</code> with <code>watch()</code> or <code>When</code> to derive classes, text, or nested conditions per item.
      </p>
      <CodeBlock filename="ForConditional.tsx" code={`import { h, ref, watch } from 'auwla'
import { For } from 'auwla'

export function StockList() {
  const stocks = ref([
    { id: 'S1', name: 'ALFA', price: 64 },
    { id: 'S2', name: 'BETA', price: 112 },
  ])

  return (
    <ul>
      <For each={stocks} key={(s) => s.id}>
        {(s) => (
          <li class={watch(ref(s.price), (p) => p > 100 ? 'text-green-600' : 'text-gray-800')}>
            {s.name}: {watch(ref(s.price), (p) => p.toFixed(2))}
          </li>
        )}
      </For>
    </ul>
  ) as HTMLElement
}`} />

      <p>
        Learn more in <Link to="/docs/reactivity/" text="Reactivity Introduction" />,
        <Link to="/docs/reactivity/ref-and-watch" text="Ref &amp; Watch" />, and
        <Link to="/docs/reactivity/composition" text="Reactive Composition" />.
      </p>
    </section>
  ) as HTMLElement
}
