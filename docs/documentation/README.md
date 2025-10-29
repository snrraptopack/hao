# Auwla Framework Documentation (JSX & Reactivity)

This document provides a focused, in-depth overview of Auwla’s JSX runtime and core reactivity primitives. It is written for developers building UI components with eager, predictable updates using `ref()` and `watch()`.

## Overview

Auwla’s UI model is simple:
- Reactive data via `ref()`.
- Eager subscriptions and derived values via `watch()`.
- A compact JSX runtime that binds refs into DOM attributes and children, and handles events.
- Component-scoped cleanup: watchers created inside components are automatically cleaned when the component unmounts.

No lazy dependency pruning is used. `watch()` remains eager and predictable.

---

## Quick Start

```tsx
import { ref, watch } from './state'

function Counter() {
  const count = ref(0)
  const doubled = watch(count, v => v * 2)

  return (
    <button onClick={() => (count.value += 1)}>
      Count: {count}, Doubled: {doubled}
    </button>
  )
}

const mount = document.getElementById('app')
if (mount) mount.appendChild(<Counter /> as unknown as Node)
```

---

## JSX Runtime

Auwla’s JSX factory (`h`) supports function components, intrinsic elements, events, reactive attributes, and reactive children.

### Elements & Events
- Use normal JSX: `<div>`, `<button>`, etc.
- Event props are lowercase after `on`: `onClick`, `onInput`, `onChange`, `onSubmit`, `onFocus`, `onBlur`, `onKeydown`.

Example:
```tsx
<button onClick={() => alert('clicked')}>Click</button>
```

### Class Names
- Use `class` or `className`.
- Static: `class="box"`.
- Reactive: pass a Ref; the runtime subscribes and updates eagerly.

```tsx
const isActive = ref(false)
const cls = watch(isActive, a => (a ? 'btn active' : 'btn'))

<div className={cls}>Hello</div>
```

Internally, class tokens are diffed for efficient add/remove.

### Styles
- String: `style="color: red;"`.
- Object: `{ style: { color: 'red', fontWeight: 'bold' } }`.
- Ref to either form: the runtime subscribes and applies updates.

```tsx
const danger = ref(false)
const style = watch(danger, d => ({ color: d ? 'red' : 'black' }))

<span style={style}>Status</span>
```

### Common Attributes
Auwla mirrors several attributes via properties when possible, and supports refs for them:
- `value`, `checked`, `disabled`, `placeholder`, `type`, `href`, `src`, `alt`

```tsx
const disabled = ref(false)
<button disabled={disabled}>Submit</button>
```

### Generic Attributes
Any other attribute can be set with a static value or a Ref. The runtime will set via property when available, or fallback to attributes.

```tsx
const titleText = watch(disabled, d => (d ? 'Please wait' : 'Ready'))
<button title={titleText}>Hover me</button>
```

### Ref Callback
Get access to the element:
```tsx
<div ref={(el) => { /* el is HTMLElement */ el.id = 'root' }} />
```

### Children
Supported child types:
- Strings / numbers: rendered as text nodes.
- DOM Nodes.
- Arrays (flattened).
- Refs to any of the above: the runtime subscribes and updates children eagerly.

```tsx
const msg = ref('Hello')
<div>{msg}</div>
```

---

## Reactivity Primitives

### `ref<T>(initial: T): Ref<T>`
Creates a reactive value.

- Access current value via `ref.value`.
- Assign to update: `ref.value = next`.
- Subscribe manually (rare in app code): `ref.subscribe(cb)` returns an unsubscribe function.

```ts
import { ref } from './state'

const count = ref(0)
count.value += 1

const unsub = count.subscribe(v => console.log('count:', v))
// Later: unsub()
```

### `watch(source, callback): Ref | () => void`
Eagerly watches one or more sources. There are two modes:

1) Derived value (returns a Ref)
- If `callback` returns a value, `watch` returns a Ref of that derived value.
- Use this for anything you plan to bind into the DOM or feed other computations.

```ts
import { ref, watch } from './state'

const a = ref(1)
const b = ref(2)

// Single source
const triple = watch(a, v => v * 3) // Ref<number>

// Multiple sources
const sum = watch([a, b], ([aa, bb]) => aa + bb) // Ref<number>
```

2) Side effect (returns a cleanup function)
- If `callback` returns `void`, `watch` sets up an eager side-effect and returns a cleanup.
- Inside a component, cleanup is automatic; outside a component, call the cleanup manually.

```ts
const count = ref(0)

// Side effect
const cleanup = watch(count, v => {
  console.log('count changed:', v)
})
// Later, if created outside a component: cleanup()
```

#### Equality & Re-run Behavior
- `watch` compares the current values to the previous via a shallow strategy.
- Arrays: element-wise reference equality.
- Objects: plain-object keys compared by reference; DOM Nodes and non-plain objects are treated as unequal unless strictly equal.
- If values did not change under this check, watchers do not re-run.

#### Batching & Flush
- Updates to refs are batched in a microtask.
- Use `flushSync()` to force immediate delivery (helpful in tests).
- Use `flush()` to await the reactive microtask and the next animation frame.

```ts
import { ref, watch, flushSync } from './state'

const n = ref(0)
const doubled = watch(n, v => v * 2)

n.value = 1
flushSync()
console.log(doubled.value) // 2
```

#### Component Auto-Cleanup
- When `watch` is called inside a function component, it is automatically registered for cleanup on unmount.
- When called outside a component, keep the returned cleanup function if using side effects.

---

## Common Patterns

### Conditional Class
```tsx
const active = ref(false)
const cls = watch(active, a => (a ? 'tab active' : 'tab'))

<div className={cls}>
  <button onClick={() => (active.value = !active.value)}>Toggle</button>
</div>
```

### Conditional Style
```tsx
const warn = ref(false)
const style = watch(warn, w => ({ color: w ? 'red' : 'black' }))

<span style={style}>Status</span>
```

### Disabled State
```tsx
const canSubmit = ref(false)
<button disabled={watch(canSubmit, v => !v)}>Submit</button>
```

### Reactive Text & Derived Inline
```tsx
const count = ref(0)
const info = watch(count, v => `Clicked ${v} times`)

<button onClick={() => (count.value += 1)}>{info}</button>
```

---

## DevTools Overlay

Enable the overlay for live stats in development.

```ts
import { enableDevToolsOverlay } from './index'

enableDevToolsOverlay({ hotkey: 'Alt+D', position: 'bottom-right', defaultOpen: true })
```

You can inspect refs, watchers, trigger counts, and performance hints.

---

## Best Practices

- Use `watch()` for derived values you bind to DOM and for side effects.
- Keep reactive values as `ref`s; pass refs directly to JSX attributes and children.
- Prefer simple, predictable updates; avoid complex mutation of deeply nested objects. Update refs with new object/array references when practical.
- In tests, use `flushSync()` to assert derived values after ref updates.

---

## What’s Next

This is the first pass focused on JSX runtime and reactivity. Next sections to add based on your direction:
- Components & lifecycle (mount/unmount patterns)
- Routing basics and `Link` active-state patterns
- List rendering and keyed updates in the DSL
- Data fetching utilities and caching
- DevTools deep dive (graph, issues, performance metrics)

Please review and tell me what’s missing or what you want prioritized next.