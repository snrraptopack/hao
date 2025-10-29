import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsRefWatch() {
  return (
    <section class="docs-prose">
      <h1>Ref &amp; Watch</h1>

      <blockquote>
        <p><em>“If you don’t know what will change, don’t try to change it.”</em></p>
        <p><em>“If you know what will change, you watch it to change.”</em></p>
      </blockquote>

      <p>
        Auwla’s reactivity is explicit and shallow. You choose which values are reactive
        using <code>ref()</code>, and you connect updates with <code>watch()</code>.
        No component re-renders; only the bound text nodes, attributes, classes, and styles update
        when their sources change.
      </p>

      <h2>Overview</h2>
      <ul>
        <li><code>ref&lt;T&gt;(initial)</code>: creates a reactive value with <code>.value</code> and <code>.subscribe()</code>.</li>
        <li><code>watch(source, fn)</code>:
          <strong> computed</strong> when <code>fn</code> returns a value → returns a derived <code>Ref</code>;
          <strong> effect</strong> when <code>fn</code> returns nothing → returns a <code>cleanup()</code> function.</li>
        <li>Auto-cleanup: inside components, watchers are cleaned up when the component unmounts.</li>
        <li>Shallow reactivity: changes are detected by shallow comparison of values.</li>
      </ul>

      <h2>Ref</h2>
      <p>
        A <code>Ref</code> wraps a value and notifies subscribers when <code>.value</code> changes.
        Subscriptions are batched and delivered asynchronously by default.
      </p>

      <CodeBlock filename="RefBasics.tsx" code={`import { h, ref } from 'auwla'

export function Counter() {
  const count = ref(0)

  // Manual subscription (returns cleanup)
  const stop = count.subscribe(v => console.log('count:', v))

  return (
    <button class=\"px-3 py-2 rounded bg-indigo-600 text-white\" onClick={() => count.value++}>
      Clicked {count} times
    </button>
  ) as HTMLElement

  // later: stop() // unsubscribe
}`} />

      <p>
        Use <code>.subscribe()</code> when you need to react to changes outside JSX.
        It returns a function to clean up the subscription. When rendering in JSX, you can insert
        refs directly; bound text nodes update without re-rendering the component.
      </p>

      <h2>Watch</h2>
      <p>
        <code>watch()</code> wires one or more refs to either a derived <code>Ref</code> (computed)
        or a side-effect (effect). Inside components, cleanup is automatic.
      </p>

      <CodeBlock filename="ComputedAndEffect.tsx" code={`import { h, ref, watch } from 'auwla'

export function Demo() {
  const count = ref(0)

  // Computed: returns a derived Ref
  const doubled = watch(count, (v) => v * 2)

  // Effect: returns a cleanup function (auto-clean inside components)
  watch([count], ([v], prev) => {
    console.log('count changed:', prev, '->', v)
  })

  return (
    <div class=\"space-y-2\">
      <button class=\"px-3 py-2 rounded bg-gray-900 text-white\" onClick={() => count.value++}>Inc</button>
      <div>Count: {count}</div>
      <div>Doubled: {doubled}</div>
    </div>
  ) as HTMLElement
}`} />

      <ul>
        <li>Computed: return a value from the callback to get a new <code>Ref</code>.</li>
        <li>Effect: return nothing to run side effects; cleanup function is returned.</li>
        <li>Multiple sources: pass an array of refs, callback receives <code>[values]</code> and <code>oldValues</code>.</li>
      </ul>

      <h2>Shallow Reactivity</h2>
      <p>
        Auwla compares values shallowly to avoid redundant work. To trigger updates, change
        the value or replace the reference.
      </p>
      <ul>
        <li>Primitives: <code>count.value = count.value + 1</code> changes immediately.</li>
        <li>Objects: prefer immutable updates: <code>user.value = {`{ ...user.value, name: 'Jane' }`}</code>.</li>
        <li>Arrays: avoid in-place mutation; use new arrays: <code>items.value = [...items.value, next]</code>.</li>
        <li>Mutating <code>.value</code> in place (e.g., <code>push</code>, <code>splice</code>, property assign)
            does not notify unless you reassign <code>.value</code> to a new reference.</li>
      </ul>

      <CodeBlock filename="ShallowTips.tsx" code={`import { ref, watch } from 'auwla'

const items = ref([1, 2])

// ❌ No notification: in-place mutation
items.value.push(3)

// ✅ Notify watchers: replace the array reference
items.value = [...items.value, 3]

// Derived ref only recomputes when shallowly unequal
const size = watch(items, (arr) => arr.length)
`} />

      <h2>Common Misconceptions</h2>
      <ul>
        <li>Ref of an array does not make objects inside it reactive. Mutating an item in place won’t notify; replace the array reference or use property‑level refs.</li>
        <li>Ref of an object does not make its properties refs. In‑place property assignments won’t notify; replace the object or make specific properties refs.</li>
        <li>Avoid double wrapping. Don’t wrap an object in a ref and also wrap its properties as refs unless you truly need both. Prefer targeting the properties you want reactive.</li>
      </ul>

      <CodeBlock filename="NestedRefPatterns.tsx" code={`import { h, ref, watch } from 'auwla'

// Object ref (whole object is reactive) + plain object with a ref property
type User = { name: string; age: number }

export function Profile() {
  const user = ref<User>({ name: 'Ada', age: 30 })

  // Not wrapped as a ref: properties themselves are refs
  const prefs = {
    theme: ref<'light' | 'dark'>('light'),
    notifications: ref(true),
  }

  function rename(next: string) {
    // ❌ in-place property assignment DOES NOT notify watchers
    // user.value.name = next

    // ✅ replace the object reference
    user.value = { ...user.value, name: next }
  }

  function toggleTheme() {
    prefs.theme.value = prefs.theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleNotifications() {
    prefs.notifications.value = !prefs.notifications.value
  }

  return (
    <div>
      <div>Name: {watch(user, (u) => u.name)}</div>
      <div>Theme: {prefs.theme}</div>
      <div>Notifications: {watch(prefs.notifications, (n) => (n ? 'on' : 'off'))}</div>
      <button class="px-2 py-1 border rounded" onClick={() => rename('Linus')}>Rename</button>
      <button class="ml-2 px-2 py-1 border rounded" onClick={toggleTheme}>Toggle Theme</button>
      <button class="ml-2 px-2 py-1 border rounded" onClick={toggleNotifications}>Toggle Notifications</button>
    </div>
  ) as HTMLElement
}

// Property-level refs are independent sources; updating them notifies without replacing any object.
// Avoid double wrapping: don't wrap the outer 'prefs' in a ref unless you need to replace it wholesale.
`} />

      <h2>Cleanup</h2>
      <ul>
        <li><code>ref.subscribe()</code> returns an <code>unsubscribe()</code> cleanup.</li>
        <li><code>watch(effect)</code> returns a <code>cleanup()</code> function; call it when used outside components.</li>
        <li>Inside components, watchers are auto-cleaned when the component unmounts.</li>
      </ul>

      <h2>API at a Glance</h2>
      <ul>
        <li><code>ref&lt;T&gt;(initial: T): Ref&lt;T&gt;</code> with <code>.value</code> and <code>.subscribe(cb): () =&gt; void</code>.</li>
        <li><code>watch&lt;T, R&gt;(source: Ref&lt;T&gt; | Ref&lt;any&gt;[], fn: (value, oldValue?) =&gt; R): Ref&lt;R&gt;</code> (computed).</li>
        <li><code>watch&lt;T&gt;(source: Ref&lt;T&gt; | Ref&lt;any&gt;[], fn: (value, oldValue?) =&gt; void): () =&gt; void</code> (effect).</li>
      </ul>

      <p>
        Continue with <Link to="/docs/control-flow" text="Control Flow" /> or learn how to structure
        application state in <Link to="/docs/state-management" text="State Management" />.
        Also see <Link to="/docs/reactivity/composition" text="Reactive Composition" /> to pass state between components.
      </p>
    </section>
  ) as HTMLElement
}