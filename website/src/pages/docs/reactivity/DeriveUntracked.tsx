import { h } from 'auwla'
import { CodeBlock } from '@/components/CodeBlock'

export function DocsDeriveUntracked() {
  const deriveCode = `import { ref, derive } from 'auwla'

const first = ref('Ada')
const last = ref('Lovelace')
const full = derive(() => first.value + ' ' + last.value)

// full.value updates when first or last changes`

  const untrackedCode = `import { ref, derive, untracked } from 'auwla'

const a = ref(1)
const b = ref(2)

const sum = derive(() => {
  const x = a.value
  const y = untracked(() => b.value) // ignore b in dependency graph
  return x + y
})`

  return (
    <section class="docs-prose">
      <h1>derive and untracked</h1>
      <p>derive creates a computed ref that tracks all dependencies accessed during its compute function. untracked lets you temporarily read a ref without subscribing to it.</p>
      <CodeBlock code={deriveCode} language="ts" filename="derive.ts" />
      <h2>Selective Dependencies</h2>
      <p>Use `untracked()` to exclude a specific read from being tracked when building a computation.</p>
      <CodeBlock code={untrackedCode} language="ts" filename="untracked.ts" />
      <h2>Implementation References</h2>
      <ul class="list-disc pl-6">
        <li>derive: `src/state.ts:480–567`</li>
        <li>untracked: `src/state.ts:75–84`</li>
      </ul>
    </section>
  ) as HTMLElement
}
