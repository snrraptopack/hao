# Chapter 17 — Advanced Routing & Query Handling

Beyond basic path params, handle query params reactively and build paths programmatically.

## Query Hook
```ts
import { useQuery } from '../../src/router'
const query = useQuery() // Ref<QueryParams>
```

## Derived Query Values
```tsx
import { h } from '../../src/jsx'
import { useQuery, useRouter } from '../../src/router'
import { watch, type Ref } from '../../src/state'

export function Search(): HTMLElement {
  const router = useRouter()
  const query = useQuery()
  const qRef: Ref<string> = watch(query, (q) => q.q || '') as Ref<string>

  const updateQuery = (value: string) => {
    // Build a path with encoded query
    const qs = new URLSearchParams({ q: value }).toString()
    router.replace(`/search?${qs}`)
  }

  return (
    <div>
      <input value={qRef.value} oninput={(e) => updateQuery((e.currentTarget as HTMLInputElement).value)} />
      <div>Query: {qRef.value}</div>
    </div>
  )
}
```

## Path Builders
Use helpers to keep route building centralized:
```ts
// src/routes.ts
export function pathFor<P extends string>(pattern: P, params: PathParams<P>, query?: Record<string, string | number>): string { /* ... */ }
```

## Exercise
- Create a search page that updates the `q` param as you type.
- Use `pathFor` (or a small util) to build URLs programmatically.

## Checklist
- [ ] You read and derived query values.
- [ ] You updated the URL without full rerender via router.
- [ ] You built paths using a helper for consistency.