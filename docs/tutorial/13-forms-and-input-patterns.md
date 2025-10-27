# Chapter 13 — Forms & Input Patterns

Inputs are straightforward: read/write values via events and refs. Compose small helpers when patterns repeat.

## Basic Binding
```tsx
import { h } from '../../src/jsx'
import { ref } from '../../src/state'

export function SearchBox(): HTMLElement {
  const query = ref('')
  const onInput = (e: Event) => {
    query.value = (e.currentTarget as HTMLInputElement).value
  }
  return (
    <div class="space-y-2">
      <input class="border p-2 w-full" value={query.value} oninput={onInput} />
      <div class="text-sm text-gray-600">Query: {query.value}</div>
    </div>
  )
}
```

## Derived Filtering
```ts
// src/app/modules/posts/utils.ts
import { watch, type Ref } from '../../../state'
export function filterPostsByQuery(posts: Ref<any[]>, query: Ref<string>) {
  return watch([posts, query], ([list, q]) => {
    const t = (q || '').toLowerCase()
    return (list || []).filter((p) => p.title.toLowerCase().includes(t))
  })
}
```

## Validation Pattern
```tsx
function EmailInput(): HTMLElement {
  const email = ref('')
  const isValid = watch(email, (e) => /.+@.+\..+/.test(e))
  const onInput = (e: Event) => {
    email.value = (e.currentTarget as HTMLInputElement).value
  }
  return (
    <div>
      <input value={email.value} oninput={onInput} class="border p-2 w-full" />
      <When>
        {isValid}
        {() => <div class="text-green-600">Looks good</div>}
        {() => <div class="text-red-600">Invalid email</div>}
      </When>
    </div>
  )
}
```

## Exercise
- Build a small form with validation on each field.
- Use derived refs to enable/disable submit.

## Checklist
- [ ] You bound inputs to refs.
- [ ] You derived validation state.
- [ ] You composed UI with `When` for feedback.