# Chapter 8 — App State & Derived State

Keep state near usage, derive what you need, and use the router’s state store for cache and per-route data.

## Local vs Shared State
- Local: `ref` inside a component (auto-cleanup).
- Shared: export a `ref` from a module (manual lifecycle).

```ts
// src/app/modules/posts/state.ts
import { ref, type Ref } from '../../../state'
export const lastViewedPostId: Ref<number | null> = ref(null)
```

## Derived State from Params
```tsx
import { h } from '../../src/jsx'
import { watch, type Ref } from '../../src/state'
import { useParams } from '../../src/router'

export function PostParamsDemo(): HTMLElement {
  const params = useParams()
  const idRef: Ref<string> = watch(params, (p) => p.id) as Ref<string>
  return <div>Current post ID: {idRef.value}</div>
}
```

## Router State Cache
- `fetch` wires results into router state via `cacheKey`.
- Read-only usage; prefer services to coordinate cache keys.

## Exercise
- Create a shared `Ref` for “last viewed user id” and update it from `UserDetail`.
- Render a breadcrumb that shows this value on the layout.

## Checklist
- [ ] You created module-level shared state.
- [ ] You derived state from params with `watch`.
- [ ] You understand router state vs component local state.