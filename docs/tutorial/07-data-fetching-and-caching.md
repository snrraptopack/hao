# Chapter 7 — Data Fetching & Caching

Use the built-in `fetch` helper (or thin services) to load data, track loading/error, and cache results.

## The Fetch Helper
```ts
// src/fetch.ts (shape)
export interface FetchState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  refetch: () => Promise<void>
}

export function fetch<T>(opts: { url: string; cacheKey?: string }): FetchState<T> { /* ... */ }
```

## Direct Usage
```tsx
import { h } from '../../src/jsx'
import { fetch } from '../../src/fetch'

export function Todos(): HTMLElement {
  const todos = fetch<any[]>({ url: 'https://jsonplaceholder.typicode.com/todos', cacheKey: 'todos' })
  return (
    <div>
      {todos.loading.value && <div>Loading…</div>}
      {todos.error.value && <div class="text-red-600">{todos.error.value}</div>}
      <ul>
        {(todos.data.value || []).slice(0, 5).map(t => <li>{t.title}</li>)}
      </ul>
      <button class="mt-2" onclick={() => todos.refetch()}>Refetch</button>
    </div>
  )
}
```

## Service Wrapper (Recommended)
```ts
// src/app/modules/posts/api.ts
import { fetch } from '../../../fetch'
import { watch, type Ref } from '../../../state'

export type Post = { id: number; title: string; body: string; userId: number }
export function listPosts(): ReturnType<typeof fetch<Post[]>> {
  return fetch<Post[]>({ url: 'https://jsonplaceholder.typicode.com/posts', cacheKey: 'posts:list' })
}
export function getPost(id: Ref<string>) {
  const url: Ref<string> = watch(id, (v) => `https://jsonplaceholder.typicode.com/posts/${v}`) as Ref<string>
  const cacheKey: Ref<string> = watch(id, (v) => `posts:${v}`) as Ref<string>
  return fetch<Post>({ url: url.value, cacheKey: cacheKey.value })
}
```

## Exercise
- Create `users/api.ts` with `listUsers` and `getUser` functions.
- Use `getUser` in a `UserDetail` component, showing loading/error.

## Checklist
- [ ] You used `fetch` directly and via a service.
- [ ] You provided a `cacheKey`.
- [ ] You wired a `Ref` param into a dynamic URL.