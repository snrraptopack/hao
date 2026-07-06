# `track` — Async Lifecycle Primitive

`track` is the core async state primitive in Auwla. It wraps async operations (local promises or remote RPC functions) and exposes their status reactively. Any Auwla component that reads a track's status or value is automatically subscribed to updates and re-renders when the promise settles — **no manual hooks, signals, or `commit()` calls required.**

---

## 1. Local Async Functions

You can track standard browser async operations (like local `fetch` calls, timers, or custom microtasks) directly:

```ts
import { track } from 'auwla/track'

const posts = track('loadPosts', async (signal) => {
  const res = await fetch('/api/posts', { signal })
  return res.json()
})

// Read reactively in render closure:
return () => (
  <div>
    {posts.pending && <p>Loading...</p>}
    {posts.rejected && <p class="error">Error: {String(posts.reason)}</p>}
    {posts.resolved && (
      <ul>
        {posts.value.map(p => <li key={p.id}>{p.title}</li>)}
      </ul>
    )}
  </div>
)
```

---

## 2. Remote Queries — `track.get`

`track.get` executes a server-side `GET` remote function and returns a reactive `TrackHandle`. It automatically types arguments and return values against your project's generated server manifest.

```ts
import { track } from 'auwla/track'
import { getPost } from './posts.server' // Imported server stub

// Typings are inferred automatically!
const post = track.get(getPost)
```

### Stale-While-Revalidate (SWR) Caching

All remote query results are cached. If a query has been resolved previously, Auwla:
1. **Instantly returns the cached value** (zero loading state, UI renders instantly).
2. **Fires a background sync request** in the background to fetch the latest state from the server.
3. **Smoothly updates the UI** only if the server data has changed.

### Cache Scoping & Custom Identifiers

By default, queries are scoped to the current route path. You can customize the caching namespace and lifecycle using options:

| Cache Scope Mode | Registry Namespace Prefix | Sensitive to Route URL? | Persists Across Navigations? | Best For |
|---|---|---|---|---|
| **Default** (neither) | `routePath::...` | **Yes** | **No** (cleared on route unmount) | Page-specific content (e.g. current page comments). |
| **`global: true`** | `__global::...` | **No** (app-wide singleton) | **Yes** (persists indefinitely) | App-wide configurations, theme settings, current user auth (`auth.me`). |
| **`id: string`** | `id:${id}::...` | **No** (route-independent) | **Yes** (persists indefinitely) | Shared entity/resource data that appears on multiple pages (e.g. details of post `123`). |

### Caching Options Reference

```ts
const post = track.get('posts.getPost', {
  // 1. Custom Cache ID: scopes cache to this specific entity across different routes
  id: `post-${params.id}`,

  // 2. Global: scopes cache globally, ignoring current URL and params
  global: true,

  // 3. Skip Background Sync: serve from cache but DO NOT trigger background refetch
  skipBackgroundSync: true,

  // 4. Abort Signal
  signal: controller.signal
})
```

---

## 3. Remote Commands / Mutations — `track.post`

`track.post` creates a lazy command handle for server-side `POST` mutations. Unlike queries, **no network request is sent to the server until you call `.run()`**.

```ts
import { track } from 'auwla/track'

const save = track.post('posts.createPost')

async function onSubmit(data: { title: string }) {
  // Invokes the server mutation
  const result = await save.run(data)
  // save.result contains the reactive TrackHandle for this execution
}
```

### Rendering Post-Mutation State

You can use the command's status cells directly in your render closure:

```tsx
return () => (
  <div>
    <button onClick={onSubmit} disabled={save.pending}>
      {save.pending ? 'Saving…' : 'Save'}
    </button>

    {save.rejected && <p class="error">{String(save.reason)}</p>}
    {save.resolved && <p class="success">Saved: {save.value.title}</p>}
  </div>
)
```

---

## 4. Forms — `track.form`

`track.form` binds a POST remote function directly to a `<form>` element. It supports progressive enhancement, client-side input validation via Standard Schema (Zod, Valibot, ArkType), and lifecycle callbacks:

```ts
import { track } from 'auwla/track'
import * as z from 'zod'

const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 chars")
})

const createPost = track.form('posts.createPost', {
  schema: postSchema,
  onSuccess: (newPost) => {
    console.log("Post saved!", newPost)
  },
  onError: (err) => {
    console.error("Form validation or server error", err)
  }
})
```

Render it directly in your JSX with clean event-handling bindings:

```tsx
return () => (
  <form onSubmit={createPost.onSubmit}>
    <label>
      Title
      <input name="title" type="text" />
    </label>
    
    <button type="submit" disabled={createPost.pending}>
      {createPost.pending ? 'Creating...' : 'Submit'}
    </button>

    {createPost.error && <p class="error">{createPost.error.message}</p>}
  </form>
)
```

---

## 5. Integration with Route Loaders (`routed`)

When using Auwla's file-based router, fetch server data inside `routed` navigation loaders using `track.get` so that pages render instantly on the client or during server-side rendering (SSR):

```ts
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router'
import { track } from 'auwla/track'

export async function routed(ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) {
  // Returns cached or starts the server fetch
  return await track.get('posts.getPost', { signal })
}

export default function PostPage() {
  const loader = getRouted(routed)
  
  if (loader?.pending) return <div>Loading...</div>
  return () => <h1>{loader?.value.title}</h1>
}
```
