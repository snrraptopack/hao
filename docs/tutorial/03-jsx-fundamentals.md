# Chapter 3 — JSX Fundamentals

JSX creates real DOM. Attributes, events, and children are applied directly.

## Elements & Attributes
```tsx
import { h } from '../../src/jsx'

export function Basics(): HTMLElement {
  return (
    <div id="greeting" class="p-4 rounded border">
      <h1 class="text-xl font-semibold">Hello</h1>
      <p data-role="subtitle">Welcome to AUWLA</p>
    </div>
  )
}
```
- String attributes map to DOM attributes.
- Boolean/number props are set directly.

## Events
```tsx
function Clicker(): HTMLElement {
  const onClick = () => alert('Clicked')
  return <button class="btn" onclick={onClick}>Click me</button>
}
```
- Use lowercase DOM event names (`onclick`, `oninput`).
- Handlers receive a DOM `Event`. Use `e.currentTarget` to access the element.

## Children & Fragments
```tsx
import { Fragment } from '../../src/jsx'

function List(): HTMLElement {
  return (
    <ul>
      <Fragment>
        <li>One</li>
        <li>Two</li>
      </Fragment>
    </ul>
  )
}
```

## Refs in Props
If a prop value is a `Ref`, the runtime binds updates for you:
```tsx
import { ref, watch } from '../../src/state'

function LiveTitle(): HTMLElement {
  const title = ref('Welcome')
  const onInput = (e: Event) => {
    title.value = (e.currentTarget as HTMLInputElement).value
  }
  return (
    <div>
      <input value={title.value} oninput={onInput} />
      <h2 class="mt-2">{title.value}</h2>
    </div>
  )
}
```

## Exercise
- Build `Basics`, `Clicker`, and `LiveTitle` and render them.
- Inspect the DOM to see real nodes and attributes.

## Checklist
- [ ] You can bind events.
- [ ] You can render fragments.
- [ ] You used a `Ref` to update an attribute.