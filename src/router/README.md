# Auwla Router

A low-level, reactive router for Auwla. It is intentionally minimal — higher-level abstractions (file-based routing, data caching, preloading) can be built on top of it.

## Philosophy

- **URL is the source of truth.** The current path lives in a reactive cell. Any component that reads it during render is auto-subscribed.
- **Render-first.** The router does not own a component handle or call `commit()`. It is just another subscriber to the path cell.
- **Depth-first context.** Module-level `_currentContext`, `_currentLoader`, and `_currentMeta` are set during each Router render pass. Because Auwla renders depth-first and synchronously, nested routers naturally shadow these values for their subtree.
- **No caching opinions.** Loaders return promises. What you cache, how you cache it, and for how long is entirely up to you.

---

## Component Structure

Every component in Auwla is a function that returns a render closure:

```ts
function MyComponent() {
  // SETUP scope — runs once when the component is created.
  // Place initialization, state, and one-time reads here.
  const loader = getLoaderHandle<Post[]>()
  const { id } = getParams()

  return () => {
    // RENDER scope — runs on every update.
    // Only return the view here.
    if (loader?.pending) return <div>Loading…</div>
    return <article>Post #{id}</article>
  }
}
```

**The outer function is setup.** It runs exactly once. This is where you read `getParams()`, `getQuery()`, `getLoaderHandle()`, `getRouteMeta()`, and set up any local state.

**The inner closure is render.** It re-runs whenever the component is invalidated (e.g., by a reactive path change, loader resolution, or parent re-render). It should be cheap — just read the values you captured in setup and return JSX.

Do not put setup logic inside the render closure. It will re-execute on every render but won't create new reactive subscriptions or new state. Capture handles and data in setup, then read from them in render.

## The Router Component

```tsx
import { Router } from "auwla/router"

function App() {
  return () => <Router />
}
```

The Router subscribes to the reactive path cell. When the URL changes, it re-renders, matches the new path against its routes, and renders the matched component.

### Props

```ts
type RouterProps = {
  // Pass a local route set instead of using the global registry.
  routes?: Route[]

  // Block rendering until loaders resolve. See "Suspension" below.
  suspend?: boolean | SuspendConfig
}
```

---

## Defining Routes

### Global Registry

`defineRoutes` registers routes globally. Any `<Router />` without a `routes` prop will match against the global registry.

```ts
import { defineRoutes } from "auwla/router"

defineRoutes([
  { path: "/", component: Home },
  { path: "/about", component: About },
  { path: "*", component: NotFound },
])
```

### Local Routes

You can skip the global registry entirely and pass routes directly to the Router:

```ts
const myRoutes = [
  { path: "/", component: Home },
  { path: "/settings", component: Settings },
]

<Router routes={myRoutes} />
```

This is useful for nested routers or when you want route isolation.

### Nested Children

Routes can have `children`. The router flattens them automatically. A parent with both `component` and `children` is kept as its own renderable route (useful for layout/index routes).

```ts
{
  path: "/shop",
  component: ShopLayout,
  children: [
    { path: "/", component: ShopHome },      // matches /shop
    { path: "/:id", component: ProductDetail }, // matches /shop/42
  ]
}
```

### Wildcards

A catch-all route is defined with `path: "*"`. It always matches last.

```ts
{ path: "*", component: NotFound }
```

---

## Layouts

A layout is a function that receives a route component and returns a render closure. It wraps the matched route's output.

```ts
import type { RouteComponent } from "auwla/router"

function AppShell(Child: RouteComponent) {
  return () => (
    <div class="app">
      <header>My App</header>
      <main>
        <Child />
      </main>
      <footer>© 2026</footer>
    </div>
  )
}
```

The layout receives the **raw route component** (the function), not an instantiated element. It decides when and how to render it.

Apply a layout to a single route:

```ts
{ path: "/dashboard", component: Dashboard, layout: AppShell }
```

Or apply it to a group of routes with `group()`:

```ts
import { group, composeRoutes } from "auwla/router"

const adminRoutes = [
  { path: "/", component: AdminHome },
  { path: "/users", component: AdminUsers },
]

const routes = composeRoutes(
  [{ path: "/", component: Home }],
  group("/admin", { layout: AppShell }, adminRoutes),
)
```

`group()` does three things:
1. Prefixes every path with the base (e.g., `/admin`, `/admin/users`).
2. Wraps every route's component with the layout.
3. Merges the group guard with any existing route guard.

---

## Navigation

### Programmatic

```ts
import { navigate, back, forward } from "auwla/router"

navigate("/products/42")           // push state
navigate("/login", { replace: true }) // replace state
back()
forward()
```

### Links

```tsx
import { Link } from "auwla/router"

<Link href="/products" activeClass="active" exactActiveClass="exact">
  Products
</Link>
```

`Link` renders an `<a>` tag and intercepts clicks for client-side navigation. Modifier clicks (Ctrl, Meta, Shift, Alt) pass through to the browser.

**Active classes:**
- `activeClass` — applied when the current path starts with `href`.
- `exactActiveClass` — applied only when the current path equals `href` exactly.

Both default to `"active"` and `"exact-active"` respectively if omitted.

---

## Reading Route State

These work from any component rendered inside a `<Router>`:

```ts
import {
  getParams,
  getQuery,
  getLocation,
  getRouteMeta,
  isActive,
  isExactActive,
} from "auwla/router"

const { id } = getParams()        // path params — e.g., { id: "42" }
const { page } = getQuery()       // search params — e.g., { page: "2" }
const path = getLocation()        // full current path including search
const meta = getRouteMeta()       // arbitrary metadata from the route definition

isActive("/products")             // true for /products and /products/42
isExactActive("/products")        // true only for /products
```

All of these are module-level accessors set during the Router's render pass. Because Auwla renders depth-first, a nested `<Router>` will shadow these values for its own subtree.

---

## Guards

Guards decide whether navigation to a route is allowed. They are **synchronous** and run before the loader.

```ts
{
  path: "/admin",
  guard: (context) => {
    if (!isLoggedIn()) return false           // block → renders 403
    if (!isAdmin()) return "/unauthorized"    // redirect
  },
  component: AdminDashboard,
}
```

A guard receives the route context (`{ path, params, query }`) and can return:
- `false` — blocks navigation and renders a 403 message.
- `string` — redirects to that path (uses `replace` so no back-stack entry).
- `true` / `undefined` — allows navigation to proceed.

`guard` and `beforeEnter` are aliases for the same option. Use whichever reads better in your codebase.

### Group Guards

`group()` can apply a guard to every route in the group:

```ts
group("/admin", { guard: requireAuth }, adminRoutes)
```

If a route already has its own guard, the group guard runs **after** it (chained with `&&` semantics).

---

## Loaders

A route can define an async `loader`. The router runs it automatically when the route is matched and exposes a handle via `getLoaderHandle()`.

```ts
{
  path: "/posts/:id",
  loader: (context, signal) =>
    fetch(`/api/posts/${context.params.id}`, { signal }).then(r => r.json()),
  component: PostDetail,
}
```

Inside the component:

```ts
const loader = getLoaderHandle<Post>()

return () => {
  if (loader?.pending) return <div>Loading…</div>
  if (loader?.rejected) return <div>Error: {String(loader.reason)}</div>
  const post = loader?.value
  return <article>{post.title}</article>
}
```

### Loader Handle API

```ts
type TrackHandle = {
  readonly status: 'idle' | 'pending' | 'resolved' | 'rejected'
  readonly pending: boolean
  readonly resolved: boolean
  readonly rejected: boolean
  readonly value: unknown
  readonly reason: unknown
  cancel(): void
  then<TResult>(onfulfilled?: (value: unknown) => TResult): Promise<TResult>
  catch(onrejected?: (reason: unknown) => unknown): Promise<unknown>
  finally(onfinally?: () => void): Promise<unknown>
}
```

The loader receives an `AbortSignal`. If the user navigates away before the loader finishes, the in-flight request is cancelled automatically.

### Route-Level Fallbacks

```ts
{
  path: "/posts",
  loader: fetchPosts,
  pendingComponent: () => <Skeleton />,
  errorComponent: (reason) => <ErrorBanner message={String(reason)} />,
  component: PostList,
}
```

- `pendingComponent` — shown while the loader is pending (called as a plain render function, no setup scope).
- `errorComponent` — shown when the loader rejects. Receives the rejection reason.

These fallbacks are evaluated on every render so they react to loader state transitions automatically.

---

## Suspension (Blocking Navigation)

By default, navigation is **non-blocking**: the URL changes immediately, the new route component renders, and the loader runs in the background. The component checks `getLoaderHandle()?.pending` to show its own loading UI.

When `suspend` is enabled, the router **blocks rendering of the new route** until the loader resolves. The previously matched route stays visible in the DOM (dimmed via your own CSS) so the user is never staring at a blank screen.

### Enabling Suspension

```tsx
<Router suspend />
```

With custom CSS class / attribute names:

```tsx
<Router suspend={{ className: "suspended", attr: "data-suspended" }} />
```

### Styling the Suspended State

The runtime adds the configured class and attribute to `<html>` while a loader is in flight. You write the CSS:

```css
.suspended {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}
```

Or target only your app shell:

```css
html.suspended .app-shell {
  opacity: 0.6;
}
```

### How It Works

1. User clicks a link → URL updates immediately.
2. Router sees the new route has a `loader` and enters suspension.
3. The previous route component keeps rendering.
4. `html.suspended` is applied.
5. When the loader resolves or rejects, `html.suspended` is removed and the new route component renders.

If the route defines a `pendingComponent`, that is rendered **instead** of the previous route during suspension.

If the user navigates again while already suspended, the previous loader is cancelled automatically and the new one takes over.

---

## Global Hooks

### `afterEach`

```ts
import { afterEach } from "auwla/router"

afterEach((from, to) => {
  document.title = getRouteMeta<{ title?: string }>().title ?? "My App"
})
```

Runs after every successful navigation. `from` is `null` on the first page load.

---

## URL Building

```ts
import { pathFor } from "auwla/router"

pathFor("/users/:id", { id: 42 })              // => "/users/42"
pathFor("/search", {}, { q: "hello" })         // => "/search?q=hello"
```

Path params are encoded automatically. The query object is appended as a search string.

---

## Types

```ts
import type {
  Route,
  RouteComponent,
  LayoutComponent,
  RouteGuard,
  RouteContext,
  NavigateOptions,
  TypedTrackHandle,
  SuspendConfig,
  MatchedRoute,
  ResolvedRoute,
  GroupOptions,
} from "auwla/router"
```

---

## File Structure

| File | Responsibility |
|------|---------------|
| `Router.tsx` | The `Router` component, context accessors, suspension logic |
| `navigation.ts` | Reactive path cell, `navigate()`, `back()`, `forward()` |
| `routes.ts` | Registry, matching, flattening, grouping, URL building |
| `hooks.ts` | Global `afterEach` lifecycle hooks |
| `Link.tsx` | `<Link>` component with active-class toggling |
| `suspend.ts` | Global suspension state and DOM class management |
| `types.ts` | All TypeScript types |
