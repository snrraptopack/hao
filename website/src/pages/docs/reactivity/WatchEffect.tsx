import { h } from 'auwla'
import { CodeBlock } from '@/components/CodeBlock'

export function DocsWatchEffect() {
  const code = `import { ref, watchEffect } from 'auwla'

const count = ref(0)

watchEffect(() => {
  console.log('count is', count.value)
})

// Effects run on initial and re-run when tracked refs change
count.value++`

  return (
    <section class="docs-prose">
      <h1>watchEffect</h1>
      <p>Runs a reactive effect that automatically tracks dependencies accessed during execution. On any change, the effect re-runs. Cleanup happens when the component unmounts.</p>
      <CodeBlock code={code} language="ts" filename="watch-effect.ts" />
      <h2>When to Use</h2>
      <ul class="list-disc pl-6">
        <li>Logging and analytics.</li>
        <li>Imperative subscriptions and bridges.</li>
        <li>Side effects that depend on reactive state.</li>
      </ul>
      <h2>Implementation Reference</h2>
      <p>`src/state.ts:419–478`.</p>
    </section>
  ) as HTMLElement
}
