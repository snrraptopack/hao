# Chapter 11 — Modules & Data Services

Structure feature code by module. Keep data fetching logic in `api.ts` and UI in components.

## Why Services?
- Centralize endpoints and cache keys.
- Keep pages focused on UI and composition.
- Make testing easier by mocking services.

## Posts Module Example
```ts
// src/app/modules/posts/api.ts
import { fetch } from '../../../fetch'
import { watch, type Ref } from '../../../state'

export type Post = { id: number; title: string; body: string; userId: number }

export function listPosts() {
  return fetch<Post[]>({ url: 'https://jsonplaceholder.typicode.com/posts', cacheKey: 'posts:list' })
}

export function getPost(id: Ref<string>) {
  const url: Ref<string> = watch(id, (v) => `https://jsonplaceholder.typicode.com/posts/${v}`) as Ref<string>
  const cacheKey: Ref<string> = watch(id, (v) => `posts:${v}`) as Ref<string>
  return fetch<Post>({ url: url.value, cacheKey: cacheKey.value })
}
```

## Using Services in Pages
```tsx
// src/app/modules/posts/PostDetail.tsx
import { h } from '../../../jsx'
import { watch, type Ref } from '../../../state'
import { When } from '../../../jsxutils'
import { useParams } from '../../../router'
import { getPost } from './api'

export function PostDetail(): HTMLElement {
  const params = useParams()
  const idRef: Ref<string> = watch(params, (p) => p.id) as Ref<string>
  const { data, loading, error } = getPost(idRef)
  const hasError = watch(error, (e) => !!e)
  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Post Detail</h2>
      <When>
        {loading}
        {() => <div>Loading…</div>}
        {hasError}
        {() => <div class="text-red-600">Error: {error.value}</div>}
        {() => <div>{(data.value as any)?.title}</div>}
      </When>
    </div>
  )
}
```

## Exercise
- Add `users/api.ts` and refactor `UsersList` and `UserDetail` to use it.
- Put all endpoint URLs in one place.

## Checklist
- [ ] You created `api.ts` for a module.
- [ ] Pages import services, not raw `fetch`.
- [ ] Cache keys are consistent and discoverable.