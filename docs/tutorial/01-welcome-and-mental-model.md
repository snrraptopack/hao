# Chapter 1 — Welcome & Mental Model

This framework is DOM-first, reactive, and small. You write components that return actual DOM nodes via JSX. State lives in lightweight `ref`s, and `watch` wires reactivity without a virtual DOM.

## Goals
- Understand the core primitives: `h`, `ref`, `watch`, `onMount`, `When`, `For`.
- Learn the “reactive by default” mindset and how rendering works.

## Core Ideas
- JSX returns real DOM (`HTMLElement`, `DocumentFragment`, `Comment`). No heavy virtual tree.
- `ref(value)` creates reactive state. `watch(ref, fn)` reacts and can derive new refs.
- Components are functions. Lifecycle (`onMount`) runs after DOM insertion.
- `When` and `For` are structural helpers for conditional and list rendering.

## Minimal Example
```tsx
import { h } from '../src/jsx'
import { ref, watch } from '../src/state'
import { When } from '../src/jsxutils'

export function Hello(): HTMLElement {
  const name = ref('world')
  const isLong = watch(name, (n) => n.length > 5)
  const setName = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement
    name.value = input.value
  }
  return (
    <div class="space-y-2">
      <input class="border p-2" value={name.value} oninput={setName} />
      <When>
        {isLong}
        {() => <div>That’s a long name!</div>}
        {() => <div>Hello, {name.value}!</div>}
      </When>
    </div>
  )
}
```

## How Rendering Works
- The JSX factory `h` creates DOM nodes, sets attributes, and binds events.
- If a prop value is a `Ref`, it binds a watcher to update the attribute when the ref changes.
- Children are appended in-order. Components return a single root node.

## Exercise
- Create `Hello` under `src/app/modules/examples/Hello.tsx` and add it to a page.
- Try typing different names; observe conditional rendering.

## Checklist
- [ ] You can explain `ref` and `watch`.
- [ ] You know that JSX returns DOM directly.
- [ ] You’ve rendered a component and handled input.