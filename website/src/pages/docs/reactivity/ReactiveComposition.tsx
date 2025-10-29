import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsReactiveComposition() {
  return (
    <section class="docs-prose">
      <h1>Reactive Composition</h1>

      <p>
        Compose state by passing <code>Ref</code>s across functions and components, deriving new refs
        with <code>watch()</code>, and synchronizing updates explicitly. Auwla’s reactivity is
        shallow and opt-in: you choose what’s reactive and how updates flow.
      </p>

      <h2>Pass Refs Between Components</h2>
      <p>
        Pass a <code>Ref</code> to children so they can both read and update it. No re-renders occur;
        only bound DOM nodes update when the ref changes.
      </p>
      <CodeBlock filename="PassRefToChild.tsx" code={`import { h, ref } from 'auwla'

type CounterProps = { count: Ref<number> }

export function CounterView(props: CounterProps) {
  const { count } = props
  return (
    <div class=\"space-x-2\">
      <span>Count: {count}</span>
      <button class=\"px-2 py-1 border rounded\" onClick={() => count.value++}>Inc</button>
    </div>
  ) as HTMLElement
}

export function Parent() {
  const count = ref(0)
  return <CounterView count={count} /> as HTMLElement
}
`} />

      <h2>Derive Read-Only Views</h2>
      <p>
        Use <code>watch()</code> to derive a new <code>Ref</code> from one or more sources. Pass derived
        refs to children that should not mutate the original state.
      </p>
      <CodeBlock filename="DerivedRef.tsx" code={`import { h, ref, watch } from 'auwla'

export function NamePlate() {
  const first = ref('Ada')
  const last = ref('Lovelace')
  const full = watch([first, last], ([f, l]) => f + ' ' + l)

  return (
    <div>
      <div>Full: {full}</div>
      <button class=\"px-2 py-1 border rounded\" onClick={() => (first.value = 'Grace')}>Change First</button>
    </div>
  ) as HTMLElement
}
`} />

      <h2>Compose in Functions</h2>
      <p>
        Encapsulate state plus helpers in plain functions and return refs. This is a simple pattern for
        sharing logic without global state.
      </p>
      <CodeBlock filename="useCounter.tsx" code={`import { ref } from 'auwla'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const inc = () => count.value++
  const dec = () => count.value--
  return { count, inc, dec }
}

export function CounterWidget() {
  const { count, inc, dec } = useCounter(5)
  return (
    <div class=\"space-x-2\">
      <span>{count}</span>
      <button class=\"px-2 py-1 border rounded\" onClick={inc}>+</button>
      <button class=\"px-2 py-1 border rounded\" onClick={dec}>-</button>
    </div>
  ) as HTMLElement
}
`} />

      <h2>Synchronize Two Refs</h2>
      <p>
        Bridge two refs with an effect. Guard assignments to avoid loops; prefer a single source of truth
        where possible.
      </p>
      <CodeBlock filename="SyncRefs.tsx" code={`import { h, ref, watch } from 'auwla'

export function SyncDemo() {
  const a = ref('left')
  const b = ref('right')

  // One-way sync: a drives b
  watch(a, (v) => {
    if (b.value !== v) b.value = v
  })

  // Two-way binding (use cautiously):
  // watch(b, (v) => { if (a.value !== v) a.value = v })

  return (
    <div class=\"space-y-2\">
      <div>A: {a}</div>
      <div>B: {b}</div>
      <button class=\"px-2 py-1 border rounded\" onClick={() => (a.value = 'sync')}>Set A</button>
      <button class=\"px-2 py-1 border rounded\" onClick={() => (b.value = 'other')}>Set B</button>
    </div>
  ) as HTMLElement
}
`} />

      <div class="mt-4 border rounded p-4 bg-amber-50">
        <strong>Anti-pattern:</strong> symmetrical two-way watchers. They can oscillate or loop.
        Prefer one source of truth and one-way sync, or route updates through a single owner with commands.
      </div>

      <h2>Module-Level State</h2>
      <p>
        For cross-page/shared state, define refs at module scope or expose a factory that creates and returns
        refs. Keep ownership clear and updates explicit.
      </p>
      <CodeBlock filename="store.ts" code={`import { ref } from 'auwla'

// Simple store
export const modalOpen = ref(false)

// Feature-scoped factory
export function createTodoStore() {
  const items = ref<{ id: number; title: string }[]>([])
  const add = (title: string) => (items.value = [...items.value, { id: Date.now(), title }])
  return { items, add }
}
`} />

      <h2>Best Practices</h2>
      <ul>
        <li>Pass refs, not plain values, when children must react to changes.</li>
        <li>Use derived refs for read-only views; update the sources, not the derived.</li>
        <li>Keep a single source of truth; avoid symmetrical two-way watchers.</li>
        <li>Prefer immutable updates for objects/arrays to trigger shallow change detection.</li>
        <li>Place cross-cutting watchers inside composition functions to keep components focused.</li>
        <li>Avoid double wrapping (object ref and property refs) unless you truly need both.</li>
        <li>Cleanup is automatic inside components; manual watchers should be cleaned when no longer needed.</li>
      </ul>

      <h2>Patterns Cheat Sheet</h2>
      <ul>
        <li>Pass a <code>Ref</code> when the child needs to read and write.</li>
        <li>Pass a derived <code>Ref</code> when the child reads a computed view and should not mutate sources.</li>
        <li>Pass commands (functions) when the child triggers actions but ownership stays with the parent.</li>
        <li>Keep one source of truth; avoid circular syncs. If you must sync, guard assignments.</li>
        <li>Objects/arrays: replace the reference to notify; in-place mutations don’t notify.</li>
        <li>Use property-level refs for hot fields; keep the outer object plain or update immutably.</li>
        <li>Lift shared refs into a composition function or module store for reuse.</li>
        <li>Lists: use stable keys and update by replacing the array (e.g., spreads, maps, filters).</li>
      </ul>

      <p>
        Continue with <Link to="/docs/reactivity/ref-and-watch" text="Ref & Watch" /> or explore
        <Link to="/docs/reactivity/list-rendering" text="List Rendering" />.
      </p>
    </section>
  ) as HTMLElement
}