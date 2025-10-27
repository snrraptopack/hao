# Chapter 12 — External State & Persistence

Sometimes you want state that survives route changes and component unmounts. Export `ref`s from a module and update them from pages.

## Pattern
```ts
// src/app/modules/users/state.ts
import { ref, type Ref } from '../../../state'
export const lastViewedUserId: Ref<number | null> = ref(null)
```

Update it in a page:
```tsx
// src/app/modules/users/UserDetail.tsx
import { h } from '../../../jsx'
import { watch } from '../../../state'
import { useParams } from '../../../router'
import { getUser } from './api'
import { lastViewedUserId } from './state'

export function UserDetail(): HTMLElement {
  const params = useParams()
  const idRef = watch(params, (p) => p.id)
  const { data } = getUser(idRef)
  watch(data, (u: any) => { if (u) lastViewedUserId.value = u.id })
  return <div>User: {(data.value as any)?.name}</div>
}
```

## Considerations
- External refs don’t auto-clean up; they live until you reset them.
- Keep them minimal; prefer passing data down via props when possible.

## Exercise
- Track “last viewed post” similarly and render it in `AppLayout`.

## Checklist
- [ ] You exported a shared ref.
- [ ] You updated it from a page.
- [ ] You rendered it elsewhere to confirm persistence.