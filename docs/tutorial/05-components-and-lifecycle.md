# Chapter 5 — Components & Lifecycle

Components are functions returning DOM. Use lifecycle hooks to run code on mount and cleanup on unmount.

## Basic Component
```tsx
import { h } from '../../src/jsx'

export function Card(props: { title: string; children?: any[] }): HTMLElement {
  return (
    <div class="rounded border p-3">
      <h3 class="font-medium">{props.title}</h3>
      <div class="mt-2">{props.children}</div>
    </div>
  )
}
```

## onMount & Cleanup
```tsx
import { h } from '../../src/jsx'
import { onMount } from '../../src/lifecycle'

export function Clock(): HTMLElement {
  let el: HTMLElement
  return (
    <div ref={(node: HTMLElement) => (el = node)}>
      <span class="font-mono" id="time">…</span>
      {(() => {
        onMount(() => {
          const span = el.querySelector('#time') as HTMLSpanElement
          const tick = () => (span.textContent = new Date().toLocaleTimeString())
          tick()
          const id = setInterval(tick, 1000)
          return () => clearInterval(id)
        })
        return document.createComment('mount-placeholder')
      })()}
    </div>
  )
}
```
- `onMount` runs after the element is inserted into the DOM.
- Return a function from `onMount` to clean up.

## Composition
```tsx
function Dashboard(): HTMLElement {
  return (
    <div class="space-y-4">
      <Card title="Live Clock">
        <Clock />
      </Card>
      <Card title="Quick Actions">
        <button class="btn">Action</button>
      </Card>
    </div>
  )
}
```

## Exercise
- Build a component that sets up an interval on mount and clears it on unmount.
- Compose it inside a `Card` with other elements.

## Checklist
- [ ] You can write function components returning DOM.
- [ ] You used `onMount` and performed cleanup.
- [ ] You composed components together.