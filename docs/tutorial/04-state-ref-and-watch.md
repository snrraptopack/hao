# Chapter 4 — State: ref, watch & watchEffect

Fine-grained reactivity is the core. `ref` holds values; `watch` derives computed state; `watchEffect` runs side-effects when state changes.

## Refs
```ts
import { ref } from '../../src/state'
const count = ref(0)
count.value += 1
```
- `value` is the current state.
- Refs can be read in JSX (`{count.value}`).

## watch: Derived Values
```ts
import { ref, watch, type Ref } from '../../src/state'

const count = ref(0)
const doubled: Ref<number> = watch(count, (n) => n * 2)
```
- When `count.value` changes, `doubled.value` updates.
- If the callback returns a value, `watch` returns a new `Ref`.

## watchEffect: Side Effects
```ts
import { watchEffect } from '../../src/state'

const cleanup = watchEffect(count, (n) => {
  console.log('count changed:', n)
})
// Call cleanup() if created outside a component; inside components, cleanup is automatic
```
- Inside components, side-effect watchers auto-clean up on unmount.

## Multiple Sources
```ts
const first = ref('Ada')
const last = ref('Lovelace')
const full = watch([first, last], ([f, l]) => `${f} ${l}`)
```

## In JSX
```tsx
function Counter(): HTMLElement {
  const count = ref(0)
  const inc = () => (count.value += 1)
  const label = watch(count, (n) => `Count: ${n}`)
  return <button class="px-3 py-2" onclick={inc}>{label.value}</button>
}
```

## Exercise
- Create a computed ref from two inputs and render it.
- Add a side-effect `watchEffect` to log changes and confirm it cleans up.

## Checklist
- [ ] You created and updated refs.
- [ ] You wrote a derived ref with `watch`.
- [ ] You used a side-effect `watchEffect` in a component.