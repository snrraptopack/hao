# Fullstack Auwla — Research-Informed DX Discussion

> Goal: understand why SvelteKit built Remote Functions, absorb the good ideas, and design an Auwla-native solution that does **not** copy SvelteKit’s API.
>
> Hard rules for Auwla:
> - No `use server`, no `use client`, no React/Next vibes.
> - Server code lives in server-only files. Client code never imports those files.
> - `track` is the primitive. RPC is reached through `track`, not through imported function references.
> - SSR is optional. Backend is user-owned.

---

## 1. What SvelteKit did and why

SvelteKit Remote Functions are exported async functions inside a `.remote.ts` file. You import them into `.svelte` files and call them like normal functions. On the server they execute directly; on the client the compiler turns the module into `fetch` wrappers.

They introduced this because their existing `load` functions have drawbacks:

| Problem | Why it matters |
|---|---|
| **Implicit coupling** | A `+page.server.ts` loader is tied to a specific page file, but the data is used somewhere inside the component tree. Refactoring means keeping two disconnected files in sync. |
| **Wrong granularity** | Data needed only in one corner of a page still has to live in the page loader. Every navigation refetches it. |
| **Colocation risk** | Mixing server-only code (DB, secrets, env vars) with client code is dangerous. Tree-shaking mistakes and sourcemaps can leak server code. |
| **Endpoint illusion** | A server function is really a public HTTP endpoint. Frameworks that hide this with `"use server"` make it easy to forget. |
| **Async components** | Svelte 5 async runes can `await` functions directly in markup. Remote functions give those functions a typed server target. |

Their solution has four function types: `query`, `form`, `command`, `prerender`. Nice details include `devalue` serialization, `query.live`, `query.batch`, and explicit single-flight mutations.

What we should **not** copy:

- Importing `.remote.ts` directly into client components.
- The `query`/`form`/`command` wrapper API.
- Validation baked into the function declaration.
- Tight coupling to Svelte’s async runes.

---

## 2. Auwla’s equivalent pressures

Auwla already faces the same problems, but the shape is different:

- Routing is file-based, but data loading is currently manual (`track` + `fetch`).
- Components are plain functions with JSX-like rendering, so data must be explicit.
- `track` already has a lifecycle: pending, resolved, rejected, refresh, cancel, abort signal.
- The router already has `routed` for route-level navigation data loading. We should keep it and make it compose with remote functions.

This means Auwla can skip the “loader” phase entirely and make remote functions the data layer, while `routed` remains the route-level entry point for navigation-time data.

---

## 3. The Auwla design

### 3.1 Server files

Server-only files use the `.server.ts` extension. They live next to routes or in a shared `src/server/` directory.

```
src/pages/
  posts/
    index.tsx
    index.server.ts       ← remote functions for /posts
    [id].tsx
    [id].server.ts        ← remote functions for /posts/:id
  _layout.server.ts       ← middleware + shared data

src/server/
  auth.server.ts
  db.server.ts
```

Rules:

- `.server.ts` files are excluded from the client bundle.
- Client files cannot import them. The build fails if they try.
- Each named export becomes an RPC endpoint keyed as `routeName.exportName`.

```ts
// src/pages/posts/index.server.ts
import { db } from '../../../db'

export async function getPosts() {
  return db.post.findMany()
}

export async function createPost(ctx: ServerContext) {
  const { title } = ctx.locals.input
  return db.post.create({ title })
}
```

### 3.2 Type-safe params from route location

If a `.server.ts` file sits next to `[id].tsx`, the functions inside it know the params shape automatically.

```ts
// src/pages/posts/[id].server.ts
import { getParams } from 'auwla/server'

export async function getPost() {
  const { id } = getParams() // typed as { id: string }
  return db.post.findById(id)
}
```

The Vite plugin generates a per-file `Params` type from the route path:

| Route file | Params type |
|---|---|
| `posts/index.server.ts` | `{}` |
| `posts/[id].server.ts` | `{ id: string }` |
| `posts/[...slug].server.ts` | `{ slug: string[] }` |
| `posts/[category]/[id].server.ts` | `{ category: string; id: string }` |

`getParams()` is typed accordingly. No manual typing, no passing params around.

### 3.3 Reaching server functions from the client

Client components never import the server file. They reference a function by its generated key through `track.get()` or `track.post()`.

```tsx
// src/pages/posts/index.tsx
import { track } from 'auwla'

export default function PostsPage() {
  const posts = track.get('posts.getPosts')
  const save = track.post('posts.createPost')

  return () => (
    <main>
      {posts.pending && <p>Loading…</p>}
      {posts.resolved && posts.value.map((p) => <p>{p.title}</p>)}

      <button
        disabled={save.pending}
        onClick={() => save.run({ title: 'Hello' }).then(() => posts.refresh())}
      >
        Create
      </button>
    </main>
  )
}
```

`track.get(key)` and `track.post(key)` return the same `TrackHandle` as regular `track`, so pending/resolved/rejected/refresh/cancel all work identically. The method prefix filters which remote functions are allowed at the type level.

### 3.4 Method filtering with `track.get` / `track.post`

Server functions declare their HTTP method in the `.server.ts` file:

```ts
// src/pages/posts/index.server.ts
import { remote } from 'auwla/server'

export const getPosts = remote.get(async () => {
  return db.post.findMany()
})

export const createPost = remote.post([validate(schema)], async (ctx) => {
  return db.post.create(ctx.locals.input)
})
```

```tsx
// client
const posts = track.get('posts.getPosts')     // OK: getPosts is GET
const bad = track.post('posts.getPosts')      // Type error: getPosts is not POST
const save = track.post('posts.createPost')   // OK
```

If a plain async function is exported without `remote.<method>()`, it defaults to GET:

```ts
export async function getPosts() {
  return db.post.findMany()
}

// client treats it as GET
const posts = track.get('posts.getPosts')
```

This gives us method-aware types without leaking HTTP verbs into the component API unless the developer wants them.

---

## 4. Validation as middleware

Validation is not baked into a `query()` wrapper. It is a middleware that runs before the function handler and passes validated data forward.

### 4.1 Per-function middleware

```ts
// src/pages/posts/index.server.ts
import { defineMiddleware, remote } from 'auwla/server'
import * as v from 'valibot'

const validateCreatePost = defineMiddleware(async (ctx, next) => {
  const schema = v.object({ title: v.string() })
  ctx.locals.input = v.parse(schema, await ctx.request.json())
  return next()
})

export const createPost = remote.post([validateCreatePost], async (ctx) => {
  const { title } = ctx.locals.input
  return db.post.create({ title })
})
```

`remote.<method>()` declares the handler plus the middleware that runs before it. Plain async functions without `remote()` still work if no middleware is needed:

```ts
export async function getPosts() {
  return db.post.findMany()
}
```

### 4.2 File-level middleware

A `.server.ts` file can export a `middleware` array that applies to every function in the file:

```ts
// src/pages/posts/[id].server.ts
import { defineMiddleware } from 'auwla/server'

export const middleware = [
  defineMiddleware(async (ctx, next) => {
    ctx.locals.canEdit = await checkPermission(ctx.params.id, ctx.user)
    return next()
  }),
]

export async function getPost() {
  const { id } = getParams()
  return db.post.findById(id)
}

export const updatePost = remote.post(async (ctx) => {
  const { id } = getParams()
  if (!ctx.locals.canEdit) throw new Error('Forbidden')
  return db.post.update(id, ctx.locals.input)
})
```

### 4.3 Validation helper

A `validate()` helper is just sugar over `defineMiddleware`:

```ts
import { validate, remote } from 'auwla/server'
import * as v from 'valibot'

const createPostSchema = v.object({ title: v.string() })

export const createPost = remote.post(
  [validate(createPostSchema)],
  async (ctx) => {
    const { title } = ctx.locals.validated
    return db.post.create({ title })
  }
)
```

Validation is middleware. It can be composed, reordered, and reused across functions.

---

## 5. Server-side context

Remote functions need access to the request, params, locals, etc.

```ts
// src/pages/posts/[id].server.ts
import { getContext } from 'auwla/server'

export async function getPost() {
  const { request, params, locals } = getContext()
  return db.post.findById(params.id)
}
```

Context shape:

```ts
interface ServerContext<Params = Record<string, string>> {
  request: Request
  params: Params
  route: MatchedRoute
  locals: Record<string, unknown>
  redirect(path: string): Response
}
```

`getParams()` is a typed shortcut for `getContext().params`.

---

## 6. Middleware in `.server.ts` files

Middleware is defined with `defineMiddleware`. It runs on the server before remote functions in the same route tree.

```ts
// src/pages/_layout.server.ts
import { defineMiddleware } from 'auwla/server'

export const middleware = defineMiddleware(async (ctx, next) => {
  ctx.locals.user = await getUser(ctx.request)
  return next()
})
```

A `_layout.server.ts` middleware applies to itself and all child routes, matching the router’s nesting.

---

## 7. Route-level data loading with `routed`

Auwla already has `routed` for navigation-time data loading. It lives in the **client page file**, calls server functions through `track.get` / `track.post`, and passes the abort `signal` for cancellation.

```tsx
// src/pages/posts/[id].tsx
import { routed, getRouted, track } from 'auwla'

export const data = routed(async (ctx, signal) => {
  const post = await track.get('posts.getPost', ctx.params.id, { signal })
  return { post }
})

export default function PostDetail() {
  const data = getRouted()

  return () => {
    if (data?.pending) return <p>Loading…</p>
    if (data?.rejected) return <p>Error: {String(data.reason)}</p>
    return <h1>{data?.value?.post.title}</h1>
  }
}
```

`routed` is for **navigation-time data loading**. It can defer navigation when `<Router suspend>` is enabled. For targeted UI updates inside the component, use `track.get` / `track.post` directly.

### 7.1 Deferring navigation

The existing suspend mode in `Router` already handles this:

```tsx
<Router suspend />
```

When suspend is enabled, the router blocks rendering the new route until `routed` resolves. The previous route stays visible (dimmed via CSS) so the user never sees a blank screen.

For non-blocking navigation, omit `suspend`. The URL updates immediately and the component reads `getRouted()?.pending`.

### 7.2 `routed` calls server functions like normal requests

Inside `routed`, server functions are called through `track.get` / `track.post`. These return thenable `TrackHandle`s, so you can `await` them directly. The `signal` is passed through the options so navigation cancellation aborts in-flight requests.

```tsx
export const data = routed(async (ctx, signal) => {
  const [post, comments] = await Promise.all([
    track.get('posts.getPost', ctx.params.id, { signal }),
    track.get('posts.getComments', ctx.params.id, { signal }),
  ])
  return { post, comments }
})
```

On the server during SSR, `track.get` resolves to the real server function directly (no network call). On the client, it becomes an RPC request.

---

## 8. Forms

The string-based form action (`action="auwla://posts.createPost"`) is rejected. Forms should use a first-class component that binds to a remote track.

```tsx
// src/pages/posts/index.tsx
import { track, Form } from 'auwla'

export default function PostsPage() {
  const posts = track.get('posts.getPosts')
  const create = track.post('posts.createPost')

  return () => (
    <main>
      <Form track={create} onSuccess={() => posts.refresh()}>
        <input name="title" required />
        <button disabled={create.pending}>Create</button>
      </Form>

      {posts.pending && <p>Loading…</p>}
      {posts.resolved && posts.value.map((p) => <p>{p.title}</p>)}
    </main>
  )
}
```

`Form` behavior:

- With JS: intercepts submit, builds `FormData`, calls `create.run(formData)`, exposes `create.pending`/`create.error`, and calls `onSuccess` when resolved.
- Without JS: falls back to a real POST to the adapter endpoint. The endpoint runs the same validation middleware and function handler, then redirects or re-renders.

No magic strings. The form is bound to a typed track handle.

If you prefer an imperative form helper instead of a component:

```tsx
const create = track.post('posts.createPost')

<form
  onSubmit={(e) => {
    e.preventDefault()
    create.run(new FormData(e.currentTarget))
  }}
>
  ...
</form>
```

Both patterns work. `Form` is just the progressively-enhanced convenience.

---

## 9. SSR flow

### First request

1. Browser requests `/posts`.
2. Router matches `src/pages/posts/index.tsx` and `src/pages/posts/index.server.ts`.
3. If the page exports `routed`, it runs on the server. `track.get` resolves to the real server function directly.
4. During render, `track.get('posts.getPosts')` is encountered.
5. On the server, the key resolves to the real function and runs it.
6. Resolved track states are serialized into the HTML.
7. Client hydrates; tracks and `routed` data resume without refetching.

### Client navigation

1. User clicks `<Link href="/posts/42">`.
2. Router calls `routed` if defined (blocking if `suspend` is enabled).
3. For targeted data, `track.get` / `track.post` call the server function via RPC.
4. Client `track` goes pending → resolved.
5. Component re-renders.

If SSR is disabled, `routed` uses RPC and `track.get` / `track.post` use RPC from the start.

---

## 10. RPC adapter

The user still owns the server. The framework only provides a small adapter that dispatches RPC calls to the right `.server.ts` export.

```ts
// server.ts (Hono)
import { Hono } from 'hono'
import { auwlaRpc } from 'auwla/adapters/hono'

const app = new Hono()
app.use('/_auwla/*', auwlaRpc())
export default app
```

```ts
// server.ts (Express)
import express from 'express'
import { auwlaRpc } from 'auwla/adapters/express'

const app = express()
app.use('/_auwla', auwlaRpc())
app.listen(3000)
```

The adapter:

1. Receives `{ key, args, method }`.
2. Runs the middleware stack for the matched route.
3. Looks up the export in the generated manifest.
4. Verifies the method matches the function’s declared method.
5. Calls the function with the request context available via `getContext()`.
6. Returns the result or a sanitized error.

---

## 11. Mutations and revalidation

`track` already has `.run()` and `.refresh()`. Mutations use the same API.

```tsx
const save = track.post('posts.createPost')
const posts = track.get('posts.getPosts')

async function onSubmit(data: { title: string }) {
  await save.run(data)
  posts.refresh()
}
```

Revalidation is done client-side by calling `.refresh()` on the relevant track after a mutation resolves:

```tsx
const save = track.post('posts.createPost')
const posts = track.get('posts.getPosts')

async function onSubmit(data: { title: string }) {
  await save.run(data)
  posts.refresh()
}
```

Server-side invalidation is intentionally not supported: the server does not know which client tracks are active, and trying to push invalidation from the server adds complexity without a clear benefit over explicit client-side refresh.

---

## 12. Future capabilities (not v1)

Inspired by SvelteKit but kept out until the core is solid.

### 12.1 `track.live`

Server function is an async generator. Client subscribes to the stream.

```ts
export async function* clock() {
  while (true) {
    yield new Date()
    await new Promise((r) => setTimeout(r, 1000))
  }
}
```

```tsx
const time = track.live('clock')
// time.value updates as the server yields
```

### 12.2 `track.batch`

Groups multiple simultaneous calls to the same remote function into one request to solve N+1.

```ts
export const getWeather = track.batch('weather.get', async (cityIds) => {
  const rows = await db.weather.whereIn('cityId', cityIds)
  return (cityId) => rows.find((r) => r.cityId === cityId)
})
```

### 12.3 Single-flight mutations

A mutation can request refreshes of specific queries. The server validates and limits which queries it is willing to refresh.

---

## 13. Summary

- Server code lives in `.server.ts` files, separate from client code.
- Client components use `track.get(key)` / `track.post(key)` to invoke server functions.
- Method prefixes filter which remote functions are allowed at the type level.
- Route params are type-safe inside `.server.ts` files via `getParams()`.
- Validation is middleware, not a wrapper. Composable through `defineMiddleware` and `remote.<method>([...], handler)`.
- File-level middleware via exported `middleware` applies to all functions in the file.
- `routed` lives in the client page file and calls server functions via `track.get` / `track.post`. It receives an abort `signal`.
- `routed` integrates with `<Router suspend>` for deferred navigation.
- Forms use a typed `<Form track={...}>` component, not magic strings.
- `track` provides pending/resolved/rejected/refresh/cancel for local and remote work.
- Type safety comes from a Vite-generated manifest.
- The adapter is a single RPC endpoint mounted in the user’s backend.
- SSR is optional.

No `use server`. No client imports of server files. No `query`/`command` wrappers. Validation is middleware. `routed` lives in the client page file.

---

## 14. Open questions

1. **File extension.** `.server.ts` or `.remote.ts`?
2. **`remote.<method>()` vs plain function.** Should plain async functions be allowed, or should every remote function be declared with `remote.<method>([...], handler)` for consistency?
3. **Default method.** If a plain async function is exported without `remote.<method>()`, should it default to GET or require explicit declaration?
4. **`routed` export name.** Should it be `export const data = routed(...)` or `export const routed = ...`?
5. **Form component.** Should `Form` be in `auwla` core or in a separate package?
6. **Middleware ordering.** Global hooks → layout → file-level → function-level, or a different order?
