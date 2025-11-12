import { h } from 'auwla'
import { CodeBlock } from '@/components/CodeBlock'

export function DocsCreateStore() {
  const code = `import { createStore } from 'auwla'

type Todo = { id: number; text: string; done: boolean }
const store = createStore({ todos: [] as Todo[] })

function add(text: string) {
  const id = store.todos.value.length + 1
  store.todos.value = [...store.todos.value, { id, text, done: false }]
}

function toggle(id: number) {
  store.todos.value = store.todos.value.map(t => t.id === id ? { ...t, done: !t.done } : t)
}`

  return (
    <section class="docs-prose">
      <h1>createStore</h1>
      <p>A structured state helper that composes multiple refs into a cohesive store. Encourages immutable updates for optimal rendering performance.</p>
      <CodeBlock code={code} language="ts" filename="create-store.ts" />
      <h2>Implementation Reference</h2>
      <p>`src/store.ts`.</p>
    </section>
  ) as HTMLElement
}
