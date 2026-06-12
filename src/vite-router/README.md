# Auwla Vite Router

A Vite plugin that turns your `src/pages/` directory into a fully typed, code-split route table. It is a **build-time layer only** — it generates the same route objects you would write by hand and passes them to the core `auwla/router`. All routing logic, suspension, guards, and loaders are handled by the core router; this plugin just automates the wiring.

## Philosophy

- **Explicit imports, not magic.** The generated virtual module is imported explicitly in your app. You can read exactly what routes exist at any time.
- **No new primitives.** Every generated route is a plain `Route` object that works identically to a hand-written one.
- **Convention over configuration.** File names, directory structure, and named exports drive behaviour. No config files per route.

---

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [
    auwlaRouter({
      dir:     'src/pages',      // pages directory, default: 'src/pages'
      genFile: 'src/auwla.gen.ts', // type output, default: 'src/auwla.gen.ts'
      lazy:    false,             // code-split lazy routes, default: false
    }),
  ],
})
```

Then consume the virtual module in your app:

```tsx
// src/App.tsx
import { Router }  from 'auwla/router'
import routes      from 'auwla:routes'   // virtual module — resolved by plugin

export default function App() {
  return () => <Router routes={routes} suspend />
}
```

The import is explicit so you always know where routes come from. The `Router` component is not magically rewired.

---

## File Conventions

### Basic mapping

| File | Route path |
|------|-----------|
| `pages/index.tsx` | `/` |
| `pages/about.tsx` | `/about` |
| `pages/posts/index.tsx` | `/posts` |
| `pages/posts/[id].tsx` | `/posts/:id` |
| `pages/posts/[id]/comments.tsx` | `/posts/:id/comments` |
| `pages/[...404].tsx` | `*` (catch-all, always last) |

**Rules:**

- `index.tsx` at any level maps to that directory's root path.
- `[param]` becomes `:param` (e.g., `[id]` → `:id`).
- `[...name]` becomes `*` (catch-all wildcard).
- Nesting directories adds path segments.

### Supported extensions

By default: `.tsx`, `.ts`, `.jsx`, `.js`. Configurable via `extensions` option.

---

## Named Exports

Every export from a page file is optional. The plugin detects which ones exist and wires them automatically.

```ts
// pages/posts/[id].tsx

// ── 1. Guard ──────────────────────────────────────────────────────────────────
// Runs synchronously before the loader. Blocking or redirecting here prevents
// the loader from ever starting.
export const guard = (ctx: RouteContext) => {
  if (!auth.token) return '/login'     // redirect
  if (!auth.canRead) return false      // block → renders 403
}

// ── 2. routed ─────────────────────────────────────────────────────────────────
// Async data fetcher. Runs after the guard passes.
// The AbortSignal is cancelled automatically if the user navigates away.
export const routed = async (ctx: RouteContext, signal: AbortSignal) => {
  const [post, comments] = await Promise.all([
    fetchPost(ctx.params.id, signal),
    fetchComments(ctx.params.id, signal),
  ])
  return { post, comments }
}

// ── 3. pending ────────────────────────────────────────────────────────────────
// Shown while the routed function is in-flight (non-suspend mode only).
// Called as a plain render function — no setup scope.
export const pending = () => <PostSkeleton />

// ── 4. error ──────────────────────────────────────────────────────────────────
// Shown when the routed function rejects.
// getRouteError() provides the structured error context.
export function error() {
  const err = getRouteError()
  return () => (
    <div class="error">
      <h2>Could not load post</h2>
      <p>{String(err?.reason)}</p>
    </div>
  )
}

// ── 5. meta ───────────────────────────────────────────────────────────────────
// Static route metadata, readable via getRouteMeta() inside the component.
export const meta = {
  title: 'Post Detail',
  description: 'View a single post',
}

// ── 6. Default export — the page component ───────────────────────────────────
export default function PostDetail() {
  const data = getRouted(routed)
  // data.value → { post: Post; comments: Comment[] }  fully inferred, no generics

  return () => (
    <article>
      <h1>{data?.value?.post.title}</h1>
    </article>
  )
}
```

### Execution order

```
URL changes
  → route matched
  → guard runs (sync)
      → blocks (false) → navigation stopped, 403 rendered
      → redirects (string) → navigate() called with replace: true
      → passes (void/true) → continue
          → routed starts (async)
              → non-suspend: pending export rendered immediately
              → suspend: previous route stays visible (html.suspended applied)
              → resolves → component renders with data
              → rejects → error export rendered (or global errorComponent fires)
```

---

## Reading Loader Data — `getRouted()`

`getRouted()` returns a typed handle to the in-flight or resolved loader for the current route. Call it in the **setup scope** of your component.

### Typed call (recommended)

Pass the `routed` function from the same file. TypeScript infers `T` from its return type — no manual generic is needed. The function is never called at runtime; it exists purely for type inference.

```ts
export const routed = async (ctx: RouteContext, signal: AbortSignal) => {
  return fetchPost(ctx.params.id, signal)   // → Promise<Post>
}

export default function PostDetail() {
  const data = getRouted(routed)
  // data.value → Post   (fully inferred, no <Post> generic written)

  return () => (
    <article>
      <h1>{data?.value?.title}</h1>
    </article>
  )
}
```

### Untyped call

Omit the argument when you don't need the specific data type — for example in a shared loading indicator that just checks `pending`:

```ts
const data = getRouted()
// data.value → unknown

if (data?.pending) { … }
```

### Handle API

```ts
const data = getRouted(routed)

data?.value     // T | undefined — resolved data
data?.pending   // boolean
data?.resolved  // boolean
data?.rejected  // boolean
data?.reason    // unknown — rejection reason
data?.status    // 'idle' | 'pending' | 'resolved' | 'rejected'
```

### `Routed<>` utility type

When you need to name the data type explicitly elsewhere in your codebase:

```ts
import type { Routed } from 'auwla/router'

type PostData = Routed<typeof routed>
// = Post
```

### Error handling — two independent paths

| Approach | When to use | How to access error |
|----------|------------|---------------------|
| **Inline** (no `error` export) | Component handles all states itself | `data?.rejected`, `data?.reason` |
| **Route-level** (`error` export defined) | Router switches component on rejection | `getRouteError()` inside the error component |

These two paths never overlap. The router guarantees the main component only renders in the resolved state when an `error` export is present.

---

## Caching & Route State

Every route comes with a built-in, zero-abstraction cache. The `RouteContext` provides a `state` object that is permanently tied to the exact URL path (e.g., `/posts/123`).

By writing to `ctx.state`, data survives navigations without needing a global state manager or query client.

```ts
import type { RouteContext } from 'auwla/router'

type PostState = { post: Post }

export const routed = async (ctx: RouteContext<'/posts/:id', PostState>, signal: AbortSignal) => {
  // 1. Tag this route so it can be easily invalidated globally
  ctx.tag('posts')

  // 2. Return cached data immediately if we already fetched it
  if (ctx.state.post) return ctx.state.post

  // 3. Fetch and write to the state object to cache it
  const post = await fetchPost(ctx.params.id, signal)
  ctx.state.post = post

  return post
}
```

### Invalidation

To force a route to refetch, you use the `invalidate()` function from the core router. It safely clears the cache for tags or specific paths.

```ts
import { invalidate } from 'auwla/router'

// In your form submission handler:
async function deletePost() {
  await api.delete(postId)

  // Wipes the cache for ANY route that called ctx.tag('posts')
  invalidate({ tags: ['posts'] })

  // Or wipe an exact URL
  invalidate({ path: `/posts/${postId}` })

  invalidate({ path: `/posts/*` })
}
```

---

## Layouts

A `_layout.tsx` file in any pages directory automatically wraps all pages in that directory (and all subdirectories).

### Single layout

```
src/pages/
  _layout.tsx         ← wraps all pages
  index.tsx           → /
  about.tsx           → /about
  posts/
    index.tsx         → /posts
    [id].tsx          → /posts/:id
```

```tsx
// pages/_layout.tsx
import type { RouteComponent } from 'auwla/router'

export default function AppShell(Child: RouteComponent) {
  return () => (
    <div class="app">
      <nav>…</nav>
      <main>
        <Child />          {/* matched page renders here */}
      </main>
    </div>
  )
}
```

The layout receives the **raw route component function**, not an element. It decides when and how to call it. `<Child />` creates a component element — the runtime manages its lifecycle.

### Nested layouts

```
src/pages/
  _layout.tsx           ← root layout (AppShell)
  index.tsx
  dashboard/
    _layout.tsx         ← dashboard layout (DashShell)
    index.tsx           → /dashboard
    users.tsx           → /dashboard/users
```

For `/dashboard/users`, the generated component is:
```ts
component: () => AppShell(() => DashShell(DashboardUsers))
```

The outermost layout renders first. `DashShell` is nested inside `AppShell`'s `<Child />` slot. This mirrors exactly how nested `group()` calls compose layouts manually.

### Layout guards

Export a `guard` function from `_layout.tsx` to protect all routes in that directory:

```ts
// pages/dashboard/_layout.tsx
export const guard = (ctx: RouteContext) => {
  if (!auth.isDashboardUser()) return '/login'
}

export default function DashShell(Child: RouteComponent) {
  return () => <div class="dashboard"><Child /></div>
}
```

**Guard execution order** for a page with its own guard inside a nested layout group:

```
pageGuard → innerLayoutGuard → outerLayoutGuard
```

This matches how nested `group()` calls chain guards: the most specific (inner) runs first.

---

## Type Generation

On every `vite dev` start and every page file change, the plugin writes `src/auwla.gen.ts`:

```ts
// src/auwla.gen.ts — auto-generated by auwla/vite-router
// Do not edit this file directly.

declare module 'auwla/router' {
  interface Register {
    routes: [
      { path: '/' },
      { path: '/about' },
      { path: '/posts' },
      { path: '/posts/:id' },
    ]
  }
}

export {}
```

Once TypeScript sees this file, the following all become path-validated:

```ts
navigate('/posts/:id', { id: '3' })   // ✅ params required and typed
navigate('/posts/:id')                 // ❌ missing params
navigate('/nope')                      // ❌ not a registered path
isActive('/posts')                     // ✅
<Link href="/unknown" />               // ❌ compile error
```

**Commit this file.** CI and editor type-checking need it without running the dev server. The plugin regenerates it automatically on startup, so it never gets stale during development.

---

## Code Splitting (Lazy Mode)

Enable `lazy: true` to code-split every route that has a `routed` function into its own chunk:

```ts
auwlaRouter({ dir: 'src/pages', lazy: true })
```

The generated virtual module uses `import()` for lazy pages:

```ts
// What the virtual module emits for a lazy route
{
  path: '/posts/:id',
  component: (props) => __mods.get('/posts/:id')?.default?.(props) ?? (() => null),
  routed: async (ctx, signal) => {
    const mod = await __load('/posts/:id', () => import('./pages/posts/[id].tsx'))
    return mod.routed(ctx, signal)
  },
  pendingComponent: () => __mods.get('/posts/:id')?.pending?.() ?? null,
}
```

The `__load` helper is idempotent — concurrent calls for the same key share one in-flight promise and the resolved module is cached in memory for the lifetime of the page.

---

## Link Prefetch

When `lazy: true` is active, the plugin emits a `__prefetch` map. The `<Link>` component uses it to start loading a route's chunk on `mouseenter` / `touchstart` — before the user clicks:

```ts
// How Link uses it internally
onMouseEnter={() => __prefetch[href]?.()}
```

By the time the click arrives, the chunk (and its `routed` function) is already loaded or in flight, making navigations feel instant.

---

## HMR

During development, the plugin watches the pages directory. When any page or layout file is added, removed, or renamed:

1. The virtual module cache is invalidated.
2. `auwla.gen.ts` is rewritten with updated paths.
3. A **full page reload** is triggered.

A full reload is intentional — route additions and removals change the route table shape, not just component internals, so a component-level HMR update is not sufficient here.

Changes to the **content** of a page component (not its named exports) are handled by Vite's normal HMR pipeline and do not trigger a full reload.

---

## Plugin Options

```ts
interface AuwlaRouterOptions {
  /** Pages directory, relative to Vite root. Default: 'src/pages' */
  dir?: string

  /** Type output file, relative to Vite root. Default: 'src/auwla.gen.ts' */
  genFile?: string

  /** Code-split routes with a routed function into their own chunks. Default: false */
  lazy?: boolean

  /** File extensions to treat as page files. Default: ['.tsx', '.ts', '.jsx', '.js'] */
  extensions?: string[]
}
```

---

## File Structure

| File | Responsibility |
|------|---------------|
| `plugin.ts` | Vite plugin factory — virtual module resolution, HMR watcher, build hook |
| `scanner.ts` | File system scanner — page discovery, layout tree, export detection |
| `codegen.ts` | Code generation — static, lazy, and layout-aware virtual modules |
| `types.ts` | Internal types for scanner and codegen |
| `index.ts` | Public entry point — exports `auwlaRouter` and `AuwlaRouterOptions` |

---

## Relationship to the Core Router

The vite-router plugin is a **build-time automation layer**. Every route it generates is equivalent to a hand-written route. For example:

```ts
// What you would write by hand:
group('/dashboard', { layout: DashShell, guard: dashGuard }, [
  { path: '/', component: DashHome },
  { path: '/users', component: DashUsers, guard: usersGuard },
])

// What the plugin generates for the same file structure:
defineRoutes([
  {
    path: '/dashboard',
    component: () => lay0.default(page0.default),
    guard: dashGuard,
  },
  {
    path: '/dashboard/users',
    component: () => lay0.default(page1.default),
    guard: (ctx) => [usersGuard, dashGuard].reduce(
      (r, g) => r !== undefined && r !== true ? r : g(ctx), undefined
    ),
  },
])
```

If you prefer full manual control, skip the plugin entirely and use `defineRoutes()` and `group()` directly from `auwla/router`. The plugin is opt-in — explicit `defineRoutes()` routes continue to work unchanged.
