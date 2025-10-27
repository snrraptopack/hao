# Chapter 4 — State: ref & watch

Fine-grained reactivity is the core. `ref` holds values; `watch` reacts to changes and can derive new state.

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
const doubled: Ref<number> = watch(count, (n) => n * 2) as Ref<number>
```
- When `count.value` changes, `doubled.value` updates.
- If the callback returns a value, `watch` returns a new `Ref`.

## watch: Side Effects
```ts
watch(count, (n) => {
  console.log('count changed:', n)
  // return nothing → side effect only
})
```
- Inside components, side-effect watches auto-clean up on unmount.

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
- Add a side-effect `watch` to log changes and confirm it cleans up.

## Checklist
- [ ] You created and updated refs.
- [ ] You wrote a derived ref with `watch`.
- [ ] You used a side-effect `watch` in a component.