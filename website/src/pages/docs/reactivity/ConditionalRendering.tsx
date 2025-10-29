import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsConditionalRendering() {
  return (
    <section class="docs-prose">
      <h1>Conditional Rendering</h1>
      <p>
        Build reactive conditions using the <code>When</code> component and derived refs from <code>watch()</code>.
        Prefer ternaries for fallback content to avoid accidental rendering of non-boolean values.
      </p>

      <h2>When component</h2>
      <p>
        Use <code>When</code> to declaratively render the first truthy branch and a final fallback.
        Conditions are <code>Ref&lt;boolean&gt;</code>. Watches are auto-managed and cleaned up.
      </p>

      <CodeBlock filename="WhenExamples.tsx" code={`import { h, ref } from 'auwla'
import { When } from 'auwla'

export function StatusPanel() {
  const isLoading = ref(true)
  const hasError = ref(false)

  return (
    <div class=\"space-y-2\">
      <When>
        {isLoading} -> condition 1
        {() => <span class=\"text-gray-600\">Loading…</span>} -> show if condition 1 is true
        {hasError} -> condition 2
        {() => <span class=\"text-red-600\">Error!</span>} -> show if condition 2 is true
        
        //You can have as many as conditions you want here

        {() => <span class=\"text-green-700\">Ready</span>} -> a fall back if all are false
      </When>
    </div>
  ) as HTMLElement
}`} />

      <h2>Conditional class and style</h2>
      <p>
        Drive visual state with <code>watch()</code>. When the callback returns a value, it becomes a derived <code>Ref</code>.
        Bind that ref to <code>class</code> or <code>style</code> to update without re-rendering.
      </p>

      <CodeBlock filename="ConditionalClassWatch.tsx" code={`import { h, ref, watch } from 'auwla'

export function Button() {
  const danger = ref(false)

  const cls = watch(danger, (on) => on ? 'px-3 py-2 rounded bg-red-600 text-white' : 'px-3 py-2 rounded bg-gray-700 text-white')

  return (
    <button class={cls} onClick={() => danger.value = !danger.value}>
      {watch(danger, (on) => on ? 'Delete' : 'Safe')}
    </button>
  ) as HTMLElement
}`} />

      <CodeBlock filename="ConditionalStyleWatch.tsx" code={`import { h, ref, watch } from 'auwla'

export function Meter() {
  const percent = ref(30)
  const barStyle = watch(percent, (p) => ({ width: p + '%', backgroundColor: p > 60 ? '#22c55e' : '#f97316' }))

  return (
    <div class=\"w-64 h-3 bg-gray-200 rounded\">
      <div class=\"h-3 rounded\" style={barStyle}></div>
      <button class=\"mt-2 px-2 py-1 border rounded\" onClick={() => percent.value = Math.min(100, percent.value + 10)}>+10%</button>
    </div>
  ) as HTMLElement
}`} />

      <h2>Conditional text</h2>
      <p>
        Use a ternary inside <code>watch()</code> to derive the string. This keeps text reactive and avoids
        accidental rendering of non-boolean values with <code>&amp;&amp;</code>.
      </p>

      <CodeBlock filename="ConditionalTextWatch.tsx" code={`import { h, ref, watch } from 'auwla'

export function Label() {
  const online = ref(false)
  const label = watch(online, (v) => v ? 'Online' : 'Offline')

  return (
    <span class=\"text-sm\">{label}</span>
  ) as HTMLElement
}`} />

      <h2>Ternary vs <code>&amp;&amp;</code></h2>
      <ul>
        <li>Prefer ternary: <code>{'{flag ? <span>On</span> : <span>Off</span>}'}</code> ensures a fallback.</li>
        <li><code>&amp;&amp;</code> hides content when false; booleans are ignored, but non-booleans like <code>0</code> may render.</li>
        <li>For reactive text, wrap the ternary in <code>watch()</code> to produce a derived <code>Ref&lt;string&gt;</code>.</li>
        <li>For structured UI, use <code>When</code> with a final fallback branch.</li>
      </ul>

      <p>
        Learn more in <Link to="/docs/reactivity/" text="Reactivity Introduction" /> and
        <Link to="/docs/reactivity/ref-and-watch" text="Ref &amp; Watch" />.
      </p>
    </section>
  ) as HTMLElement
}