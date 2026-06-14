# Auwla Router

The Auwla router is a client-side router built on the reactive cell system.
It has no virtual DOM dependency, no manual `commit()`, and no stored component
handles. URL changes invalidate only the components that read them.

---

## Basic setup

```tsx
// src/main.tsx
import { createMemoApp } from 'auwla'
import { defineRoutes } from 'auwla/router'
import { Router } from 'auwla/router'
import Home from './pages/Home'
import Posts from './pages/Posts'
import PostDetail from './pages/PostDetail'

const routes = defineRoutes([
  { path: '/',          component: Home },
  { path: '/posts',     component: Posts },
  { path: '/posts/:id', component: PostDetail },
])

function App() {
  return () => <Router routes={routes} />
}

createMemoApp(document.getElementById('app')!, <App />)
```

---

## Route definition

```ts
import type { Route } from 'auwla/router'

const route: Route = {
  path: '/posts/:id',

  // Component rendered when this route is active
  component: PostDetail,

  // Async data fetcher. Runs after guard passes.
  // The signal is wired to an AbortController — navigating away cancels it.
  routed: async (ctx, signal) => {
    return fetch(`/api/posts/${ctx.params.id}`, { signal }).then(r => r.json())
  },

  // Shown while routed is pending (non-suspend mode).
  // Omit when using suspend or handling pending inline.
  pendingComponent: () => <Skeleton />,

  // Shown when routed rejects.
  // The Router renders this instead of the main component.
  // Use getRouteError() inside to read the structured error.
  errorComponent: PostDetailError,

  // Runs synchronously before routed starts.
  // Return false to block (403), a string to redirect, or void to proceed.
  guard: (ctx) => {
    if (!auth.token) return '/login'
  },

  // Arbitrary metadata. Read via getRouteMeta() from any component.
  meta: { title: 'Post Detail', requiresAuth: true },
}
```

### Param types

Path params are inferred from the path string via the `PathParams<P>` utility:

```ts
type PostParams = PathParams<'/posts/:id'>
// → { id: string }

type CommentParams = PathParams<'/posts/:id/comments/:commentId'>
// → { id: string; commentId: string }
```

---

## Reading route state in components

These functions are called during component setup. They read from the module-level
context that the Router writes before rendering each component.

```ts
import {
  getParams,       // { id: '3' } for /posts/:id
  getQuery,        // { page: '2' } for ?page=2
  getLocation,     // '/posts/3' — the full current path
  getRouteMeta,    // the meta object from the matched route
  getLoaderHandle, // the raw TrackHandle for the active routed function
  getRouteError,   // structured error — only valid inside an errorComponent
} from 'auwla/router'
```

---

## `routed` — async data fetching

`routed` on a route definition is the async function that loads data for that route.
The router runs it automatically when the route is matched, after the guard passes.

```ts
const routes = defineRoutes([
  {
    path: '/posts/:id',
    component: PostDetail,

    routed: async (ctx, signal) => {
      const [post, comments] = await Promise.all([
        fetchPost(ctx.params.id, signal),
        fetchComments(ctx.params.id, signal),
      ])
      return { post, comments }
    },
  },
])
```

### `getRouted(fn)` — typed data handle

Call `getRouted` in component setup, passing the same `routed` function.
TypeScript infers the return type from the function — no manual generic needed.

```ts
import { getRouted } from 'auwla/router'

function PostDetail() {
  const data = getRouted(routed)
  // data.value → { post: Post; comments: Comment[] }

  return () => (
    <article>
      <h1>{data?.value?.post.title}</h1>
    </article>
  )
}
```

The handle exposes the full lifecycle state:

```ts
data?.pending    // true while fetching
data?.resolved   // true when data arrived
data?.rejected   // true when fetch threw or network failed
data?.reason     // the raw error (unknown)
data?.value      // T | undefined
data?.status     // 'idle' | 'pending' | 'resolved' | 'rejected'
data?.cancel()   // abort the in-flight request
```

### `Routed<>` — utility type for explicit typing

When you need to name the data type elsewhere:

```ts
import type { Routed } from 'auwla/router'

type PostData = Routed<typeof routed>
// = { post: Post; comments: Comment[] }
```

---

## Guard

The guard runs **synchronously before `routed` starts**.
If it blocks or redirects, the routed function never runs.

```ts
guard: (ctx: RouteContext) => {
  // Block — renders 403
  if (!auth.token) return false

  // Redirect — navigate elsewhere
  if (!auth.token) return '/login'

  // Proceed — return void
}
```

Execution order:

```
URL changes
  → route matched
  → guard runs (sync)
      → false → 403, routed never starts
      → '/path' → redirect, routed never starts
      → void → proceed
          → routed starts (async)
```

---

## Error handling

There are two independent paths. Pick one per route.

### Path 1 — Inline (component owns all states)

No `errorComponent` on the route. The component reads the handle directly
and renders whatever it wants for each state.

```ts
function PostDetail() {
  const data = getRouted(routed)

  return () =>
    data?.pending  ? <Skeleton /> :
    data?.rejected ? <p>Error: {String(data.reason)}</p> :
    <article><h1>{data?.value?.post.title}</h1></article>
}
```

### Path 2 — Route-level (Router manages fallbacks)

Add `pendingComponent` and `errorComponent` to the route definition.
The Router renders these **instead of** the main component for those states.
When `errorComponent` is defined, the main component only ever renders
in the resolved state — `data.rejected` is always false inside it.

```ts
// The error component uses getRouteError() for the structured error
function PostDetailError() {
  const err = getRouteError()
  // err.reason   — the raw thrown value
  // err.message  — human-readable message (Error.message when available)
  // err.stack    — stack trace when reason is an Error
  // err.isAbort  — true when the loader was aborted (e.g. navigation away)
  // err.source   — currently always 'loader'
  // err.context  — { path, params, query } of the failed route
  // err.route    — the matched route that failed
  // err.loader   — the rejected loader handle
  // err.retry    — call to retry the failed loader

  return () => (
    <div>
      <h2>Could not load post</h2>
      <p>{String(err?.reason)}</p>
      <button onClick={() => err?.retry()}>Try again</button>
    </div>
  )
}

const routes = defineRoutes([
  {
    path: '/posts/:id',
    component: PostDetail,
    errorComponent: PostDetailError,
    pendingComponent: () => <Skeleton />,
    routed: fetchPost,
  },
])
```

`getRouteError()` returns `null` in any context other than an `errorComponent`.
Do not call it from the main component — use `data.reason` from the handle instead.

### Global error component

A fallback for routes that do not define their own `errorComponent`:

```tsx
<Router routes={routes} errorComponent={GlobalError} />
```

`GlobalError` is a `RouteComponent` with access to `getRouteError()`, `getParams()`,
and `getLoaderHandle()`. Per-route `errorComponent` always takes priority.

---

## Suspend

```tsx
<Router routes={routes} suspend />
```

When suspend is enabled and a route has a `routed` function:

- The old route stays visible while loading (dimmed via `html.suspended` CSS class)
- The new route only commits after `routed` resolves
- On reject: old route stays, error state is exposed; the new route commits only after you retry or navigate away
- On initial hard refresh there is no "old route", so the route's `pendingComponent` (or the Router's global `pendingComponent`) is shown

```tsx
<Router
  routes={routes}
  suspend={{
    class: 'is-loading',    // CSS class added to <html> while pending (default: 'suspended')
    attr: 'data-loading',   // data attribute added to <html> (default: 'data-suspended')
  }}
/>
```

CSS example:

```css
html.is-loading main {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 150ms ease;
}
```

### `pendingComponent` under suspend

Under suspend, `pendingComponent` is ignored during navigations — the old route
IS the pending state. On the initial hard refresh there is no old route, so the
pending fallback is rendered while the first loader runs.

`errorComponent` still works: when `routed` rejects, the new route commits but
shows `errorComponent` instead of the main component.

---

## Navigation

### `navigate()`

```ts
import { navigate } from 'auwla/router'

navigate('/posts')
navigate('/posts/3')
navigate('/posts', { replace: true })   // replaces history entry
```

With typed routes registered (see below), `navigate` validates the path and
params at compile time:

```ts
navigate('/posts/:id', { id: '3' })   // ✅
navigate('/posts/:id')                 // ❌ missing params
navigate('/unknown')                   // ❌ not a registered path
```

### `back()` / `forward()`

```ts
import { back, forward } from 'auwla/router'

back()
forward()
```

### `<Link>`

```tsx
import { Link } from 'auwla/router'

<Link href="/posts/3">View post</Link>
<Link href="/posts/3" replace>View post (replace)</Link>
```

### `isActive()` / `isExactActive()`

```ts
import { isActive, isExactActive } from 'auwla/router'

isActive('/posts')       // true for /posts and /posts/3
isExactActive('/posts')  // true only for /posts
```

---

## Type-safe navigation via `Register`

To make `navigate()`, `isActive()`, and `<Link href="">` validate against your
actual route definitions, add one module augmentation in your routes file:

```ts
// src/routes.ts
import { defineRoutes } from 'auwla/router'

export const routes = defineRoutes([
  { path: '/',           component: Home },
  { path: '/posts',      component: Posts },
  { path: '/posts/:id',  component: PostDetail },
])

// This single declaration enables type-safe navigation everywhere
declare module 'auwla/router' {
  interface Register {
    routes: typeof routes
  }
}
```

`defineRoutes` uses a `const` type parameter (TypeScript 5.0+) to preserve
the literal path types without requiring `as const` on each entry.

Without augmentation: `navigate` accepts any string (backward-compatible).
With augmentation: `navigate` only accepts registered paths with correct params.

---

## Hooks

### `afterEach`

Fires after every committed navigation (not for blocked/redirected navigations):

```ts
import { afterEach } from 'auwla/router'

afterEach((from, to) => {
  console.log(`Navigated from ${from?.path} to ${to.path}`)
  analytics.track(to.path)
})
```

---

## Route groups

Share a layout or guard across multiple routes without nesting the paths:

```ts
import { defineRoutes, group } from 'auwla/router'

const routes = defineRoutes([
  { path: '/', component: Home },

  ...group(
    { layout: DashboardLayout, guard: requireAuth },
    [
      { path: '/dashboard',  component: Dashboard },
      { path: '/settings',   component: Settings },
      { path: '/profile',    component: Profile },
    ]
  ),
])
```

---

## Nested routes (Outlet)

```ts
const routes = defineRoutes([
  {
    path: '/posts',
    component: PostsLayout,
    children: [
      { path: '',    component: PostList },
      { path: ':id', component: PostDetail, routed: fetchPost },
    ],
  },
])
```

The parent component renders an `<Outlet />` where children mount:

```tsx
import { Outlet } from 'auwla/router'

function PostsLayout() {
  return () => (
    <div>
      <PostsNav />
      <Outlet />
    </div>
  )
}
```

---

## Vite plugin — file-based routing

The `auwlaRouter()` Vite plugin turns a `src/pages` directory into a typed route
table. The explicit `defineRoutes()` API above still works if you prefer to write
routes by hand.

### Config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { auwla } from 'auwla/vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [
    auwla(),
    auwlaRouter({ dir: 'src/pages' }),
  ],
})
```

### File conventions

```
src/pages/
  index.tsx               →  /
  about.tsx               →  /about
  posts/
    index.tsx             →  /posts
    [id].tsx              →  /posts/:id
    [id]/
      comments.tsx        →  /posts/:id/comments
  [...404].tsx            →  /*  (catch-all)
```

### Named exports per page file

The plugin reads these exports and wires them into the generated route table:

| Export            | Maps to route field  |
|-------------------|----------------------|
| `default`         | `component`          |
| `routed`          | `routed`             |
| `pending`         | `pendingComponent`   |
| `error`           | `errorComponent`     |
| `guard`           | `guard`              |
| `meta`            | `meta`               |

```ts
// src/pages/posts/[id].tsx
import { getRouted, Link, type RouteContext } from 'auwla/router'
import { track } from 'auwla/events'

export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  return await track.get('posts.getPost', { signal })
}

export default function PostDetail() {
  const data = getRouted(routed)

  if (data?.pending)  return <p>Loading…</p>
  if (data?.rejected) return <p>Error: {String(data.reason)}</p>

  return () => <h1>{data?.value?.title}</h1>
}
```

No route table is written by hand.

### Server files

Place a `.server.ts` file next to a page to expose RPC functions for that route.
The Vite plugin excludes `.server.ts` files from the client bundle and generates
a manifest used by the dev server / production adapter.

```ts
// src/pages/posts/[id].server.ts
import { remote, getParams } from 'auwla/server'

export const getPost = remote.get(async () => {
  const { id } = getParams()   // typed as { id: string }
  return db.post.findById(id)
})
```

See the **Server functions** section below for the full RPC API.

### What the plugin generates

**`auwla:routes` virtual module** — imported by the app, contains the route table
built from the pages directory with dynamic imports for code splitting.

**`src/auwla.gen.ts`** — augments the `Register` interface automatically.
This file is generated for you and enables type-safe navigation without a manual
`declare module` block.

### App entry with file-based routing

```tsx
// src/App.tsx
import { Router } from 'auwla/router'
import routes from 'auwla:routes'   // virtual module — plugin generates this

export default function App() {
  return () => <Router routes={routes} suspend />
}
```

The import is explicit. The plugin does not invisibly rewire the `<Router>` component.

---

## Full API reference

| Export | Description |
|---|---|
| `Router` | Route outlet component |
| `Link` | Anchor with client-side navigation |
| `navigate(path, params?, opts?)` | Programmatic navigation |
| `back()` | Go back |
| `forward()` | Go forward |
| `getParams()` | Current route params |
| `getQuery()` | Current query string object |
| `getLocation()` | Current path string |
| `getRouteMeta<T>()` | Current route meta object |
| `getLoaderHandle<T>()` | Raw TrackHandle for current route's routed function |
| `getRouted(fn)` | Typed TrackHandle inferred from the routed function |
| `getRouteError()` | Structured error — valid only inside an errorComponent |
| `isActive(path)` | True if current path starts with path |
| `isExactActive(path)` | True if current path equals path |
| `afterEach(fn)` | Register post-navigation hook |
| `defineRoutes(routes)` | Define routes with literal path type preservation |
| `group(opts, routes)` | Share layout/guard across routes |
| `pathFor(name, params?)` | Build a path string from a named route |

| Type | Description |
|---|---|
| `Route` | Route definition object |
| `RouteContext` | `{ path, params, query }` |
| `RouteError` | `{ reason, message, stack, isAbort, source, context, route, loader, retry }` from getRouteError() |
| `RouteComponent` | Component function returning a render closure |
| `RouteGuard` | `(ctx) => boolean \| string \| void` |
| `RouteParams<P>` | Param object type for a path string |
| `Routed<F>` | Infer data type from a routed function |
| `ValidRoutePath` | Union of registered path strings |
| `Register` | Interface to augment for typed navigation |
| `SuspendConfig` | Suspend options object |
| `NavigateOptions` | `{ replace?: boolean }` |
