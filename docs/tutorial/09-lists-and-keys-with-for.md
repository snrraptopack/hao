# Chapter 9 — Lists & Keys with For

Render dynamic lists efficiently. Use `key` to keep DOM nodes stable across reorders.

## For Props
```ts
interface ForProps<T> {
  each: Ref<T[]>
  key?: (item: T, index: number) => string | number
  children?: (item: T, index: number) => Node
  render?: (item: T, index: number) => Node
}
```

## Basic Usage
```tsx
import { h } from '../../src/jsx'
import { For } from '../../src/jsxutils'
import { ref } from '../../src/state'

export function Shopping(): HTMLElement {
  const items = ref([
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
  ])
  return (
    <ul>
      <For
        each={items}
        key={(item) => item.id}
        render={(item) => <li>{item.name}</li>}
      />
    </ul>
  )
}
```

## Reorder & Stability
- When you set a `key`, the framework reuses existing nodes and moves them.
- Avoid using the index as key unless the order never changes.

## Nested Lists
You can nest `For` components to render 2D structures.

## Exercise
- Add buttons to add/remove/reorder items; observe DOM stability.
- Use `key` to maintain focus on inputs inside list items.

## Checklist
- [ ] You rendered a list with `For`.
- [ ] You used stable `key`s.
- [ ] You verified node reuse on reorder.