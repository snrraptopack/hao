# 🧩 JSX Guide

Use Auwla with JSX for a familiar authoring experience while keeping direct-DOM performance and lightweight reactivity.

---

## Setup

- `tsconfig.json`
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment",
    "types": ["./auwla-jsx", "node"],
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2015",
    "strict": true
  }
}
```

- Vite config (example)
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: { alias: { 'auwla': resolve(__dirname, 'src/index.ts') } },
  esbuild: { jsxFactory: 'h', jsxFragment: 'Fragment' },
})
```

- TS global types
  - Include `auwla-jsx.d.ts` so TypeScript accepts custom JSX intrinsic elements.

---

## Imports

```ts
import { h, Fragment, For, When } from 'auwla'
import { ref, watch, flush, flushSync, type Ref } from 'auwla'
```

---

## Basics

```tsx
function Counter() {
  const count = ref(0)
  return (
    <div className="p-4">
      {/* Reactive text: pass Ref as child */}
      {watch(count, (c) => `Count: ${c}`) as Ref<string>}

      <button className="ml-3 px-2 py-1 bg-blue-600 text-white"
              onClick={() => count.value++}>
        Increment
      </button>
    </div>
  ) as HTMLElement
}

document.querySelector('#app')!.appendChild(Counter())
```

Notes:
- Function components must return an `HTMLElement` (Auwla attaches lifecycle automatically).
- Children can be strings, `Node`, arrays, or `Ref<...>`; refs auto-update via `watch()`.

---

## Reactive Props

```tsx
const color = ref<'red' | 'green'>('red')
const active = ref(false)

function Badge() {
  return (
    <span
      // className supports Ref<string> with efficient token diffing
      className={watch(active, (a) => a ? 'px-2 py-1 bg-green-600 text-white' : 'px-2 py-1 bg-gray-300') as Ref<string>}
      // style supports object or Ref<object>
      style={watch(color, (c) => ({ border: `2px solid ${c}` })) as Ref<Record<string,string>>}
    >
      Status
    </span>
  ) as HTMLElement
}
```

---

## Lists with `<For>`

```tsx
type Item = { id: number; text: Ref<string> }
const items = ref<Item[]>([])

function ListView() {
  return (
    <ul>
      <For each={items} key={(it) => it.id}>
        {(it, i) => (
          <li className="py-0.5">
            {it.text}
          </li>
        )}
      </For>
    </ul>
  ) as HTMLElement
}

// Create
items.value = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: ref(`Item ${i}`) }))
await flush()

// Update
items.value[3].text.value = 'Updated 3'
await flush()
```

Guidance:
- Always provide a stable `key` for efficient keyed diffing.
- Duplicate keys log a warning: `[auwla] For: duplicate key detected: <key>`.
- `flush()` is ideal for benchmarks and sequencing after paint; `flushSync()` updates immediately in the same tick.

---

## Conditionals with `<When>`

```tsx
const isLoggedIn = ref(false)

function Header() {
  return (
    <When>
      {/* pair condition + renderer */}
      {isLoggedIn}
      {() => <span>Welcome back!</span>}

      {/* fallback (last item) */}
      {() => <span>Please login</span>}
    </When>
  ) as HTMLElement
}
```

Pattern:
- Pass children as an ordered list: `[Ref<boolean>, () => Node, ..., () => Node (fallback)]`.

---

## Components & Lifecycle

```tsx
import { onMount, onUnmount } from 'auwla'

function Timer() {
  let t: any
  onMount(() => { t = setInterval(() => console.log('tick'), 1000) })
  onUnmount(() => clearInterval(t))
  return <div>Timer running...</div> as HTMLElement
}
```

- Lifecycle hooks inside JSX components are tracked automatically; cleanup runs when the element is removed.

---

## DSL Interop

You can mix DSL components in JSX; they are plain `HTMLElement`s.

```tsx
import { Component } from 'auwla'

const Card = Component((ui) => {
  ui.Div({ className: 'border rounded p-4' }, (ui) => {
    ui.H3({ text: 'Title', className: 'font-bold mb-2' })
    ui.P({ text: 'Body text' })
  })
})

function Page() {
  return (
    <section>
      {Card}
    </section>
  ) as HTMLElement
}
```

---

## Scheduling Cheatsheet

- `flushSync()`: same-tick DOM visibility; use for imperative measurements.
- `flush()`: awaits microtask + next frame; use for benchmarks and post-paint sequencing.

See API details in `docs/04-api-reference.md`.

---

## Tips

- Keep list item markup lean for best create/reorder/update performance.
- Prefer per-item `Ref` values to minimize diff scope.
- Use stable `key`s; avoid key reuse to prevent warnings and subtle bugs.

---

## Examples

- Check `framework-bench/src/App.tsx` for JSX list rendering patterns.
- See `src/counter.tsx` for a complete JSX app using refs, lists, and lifecycle.