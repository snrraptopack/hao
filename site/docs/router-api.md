# Router API

While the file-based router (`auwlaRouter()`) covers most apps, Auwla also exposes a low-level, explicit routing API. Use it when you need dynamic routes, runtime route composition, or want full control over the route table.

---

## Basic Setup

```tsx
// src/main.tsx
import { createMemoApp } from 'auwla';
import { Router, defineRoutes } from 'auwla/router';
import Home from './pages/Home';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';

const routes = defineRoutes([
  { path: '/',          component: Home },
  { path: '/posts',     component: Posts },
  { path: '/posts/:id', component: PostDetail },
]);

function App() {
  return () => <Router routes={routes} />;
}

createMemoApp(document.getElementById('app')!, <App />);
```

---

## `defineRoutes()`

`defineRoutes()` builds a route table and preserves literal path types for typed navigation.

```ts
import { defineRoutes, type Route } from 'auwla/router';

const routes = defineRoutes([
  { path: '/',          component: Home },
  { path: '/about',     component: About },
  { path: '/posts',     component: Posts },
  { path: '/posts/:id', component: PostDetail, routed: fetchPost },
  { path: '*',          component: NotFound },
]);
```

### Route fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `path` | `string` | Route path. Use `:param` for params and `*` for catch-all. |
| `component` | `RouteComponent` | Component rendered when the route is active. |
| `routed` | `RoutedFn` | Async loader. Runs after the guard passes. |
| `pendingComponent` | `RouteComponent` | Fallback shown while `routed` is pending. |
| `errorComponent` | `RouteComponent` | Fallback shown when `routed` rejects. |
| `guard` | `RouteGuard` | Sync check before the loader starts. |
| `meta` | `Record<string, unknown>` | Arbitrary metadata. |
| `children` | `Route[]` | Nested child routes rendered via `<Outlet />`. |

---

## Route Loaders (`routed`)

`routed` loads data for a route. The router cancels the loader if the user navigates away.

```ts
const routes = defineRoutes([
  {
    path: '/posts/:id',
    component: PostDetail,
    routed: async (ctx, signal) => {
      const res = await fetch(`/api/posts/${ctx.params.id}`, { signal });
      return res.json();
    },
  },
]);
```

In the component, use `getRouted()` to read the typed handle:

```tsx
import { getRouted } from 'auwla/router';

function PostDetail() {
  const data = getRouted(routed);

  return () => (
    <article>
      {data?.pending && <p>Loading…</p>}
      {data?.rejected && <p>Error: {String(data.reason)}</p>}
      {data?.resolved && <h1>{data.value.title}</h1>}
    </article>
  );
}
```

The handle exposes `.pending`, `.resolved`, `.rejected`, `.value`, `.reason`, `.status`, `.cancel()`, and `.refresh()`.

---

## Guards

Guards run synchronously before `routed`. Return `false` to block, a string to redirect, or void to proceed.

```ts
const routes = defineRoutes([
  {
    path: '/admin',
    component: Admin,
    guard: (ctx) => {
      if (!auth.isAdmin) return '/login';
      // proceed
    },
  },
]);
```

Execution order:

```
URL changes
  → route matched
  → guard runs
      → false        → 403, routed never starts
      → '/login'     → redirect, routed never starts
      → void / true  → proceed, routed starts
```

---

## Error Handling

### Inline

```tsx
function PostDetail() {
  const data = getRouted(routed);

  return () =>
    data?.pending  ? <Skeleton /> :
    data?.rejected ? <p>Error: {String(data.reason)}</p> :
    <article><h1>{data?.value?.title}</h1></article>;
}
```

### Route-level

```tsx
function PostDetailError() {
  const err = getRouteError();

  return () => (
    <div>
      <h2>Could not load post</h2>
      <p>{String(err?.reason)}</p>
      <button onClick={() => err?.retry()}>Try again</button>
    </div>
  );
}

const routes = defineRoutes([
  {
    path: '/posts/:id',
    component: PostDetail,
    errorComponent: PostDetailError,
    pendingComponent: () => <Skeleton />,
    routed: fetchPost,
  },
]);
```

When `errorComponent` is defined, the main component only renders in the resolved state. `getRouteError()` only works inside error components.

### Global

```tsx
<Router routes={routes} errorComponent={GlobalError} pendingComponent={GlobalPending} />
```

---

## Suspend Mode

```tsx
<Router routes={routes} suspend />
```

When suspend is enabled and a route has a `routed` function:

- The old route stays visible while the new route loads.
- The `<html>` element gets a configurable CSS class/attribute (default: `html.suspended`).
- The new route commits only after the loader resolves.
- On initial load, the route's `pendingComponent` is shown.

```tsx
<Router
  routes={routes}
  suspend={{
    class: 'is-loading',
    attr: 'data-loading',
  }}
/>
```

---

## Route Groups

`group()` shares a layout or guard across multiple routes without nesting paths.

```tsx
import { defineRoutes, group } from 'auwla/router';
import Home from './pages/Home';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

const routes = defineRoutes([
  { path: '/', component: Home },

  ...group('/dashboard', { layout: DashboardLayout, guard: requireAuth }, [
    { path: '',         component: Dashboard },
    { path: '/settings', component: Settings },
  ]),

  { path: '*', component: NotFound },
]);
```

`group()` returns a `Route[]` that you can spread into `defineRoutes()`.

---

## Nested Routes with `Outlet`

```tsx
const routes = defineRoutes([
  {
    path: '/posts',
    component: PostsLayout,
    children: [
      { path: '',    component: PostList },
      { path: ':id', component: PostDetail, routed: fetchPost },
    ],
  },
]);
```

The parent component renders `<Outlet />` where children mount:

```tsx
import { Outlet } from 'auwla/router';

function PostsLayout() {
  return () => (
    <div>
      <PostsNav />
      <Outlet />
    </div>
  );
}
```

---

## `composeRoutes()`

Merge multiple route arrays. Useful when routes are defined in separate modules.

```tsx
import { defineRoutes, composeRoutes } from 'auwla/router';
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboard';

const routes = defineRoutes(
  composeRoutes(authRoutes, dashboardRoutes, [
    { path: '/', component: Home },
    { path: '*', component: NotFound },
  ])
);
```

---

## Reading Route State

Call these helpers in component setup. They read from the router's current context.

```tsx
import {
  getParams,
  getQuery,
  getLocation,
  getRouteMeta,
  getLoaderHandle,
  getRouted,
  getRouteError,
} from 'auwla/router';

function PostDetail() {
  const { id } = getParams('/posts/:id');  // { id: string }
  const query = getQuery();                 // ?tab=comments → { tab: 'comments' }
  const loc = getLocation();                // '/posts/42?tab=comments'
  const meta = getRouteMeta<{ title: string }>();

  return () => <h1>Post {id}</h1>;
}
```

---

## Navigation

### `<Link>`

```tsx
<Link href="/posts">Posts</Link>
<Link href="/posts/:id" params={{ id: '3' }}>View Post</Link>
<Link href="/posts" replace>Replace history</Link>
<Link href="/posts" activeClass="active">Nav item</Link>
<Link href="/posts" exactActiveClass="active">Exact match</Link>
```

### Programmatic navigation

```tsx
import { navigate, back, forward } from 'auwla/router';

navigate('/posts');
navigate('/posts/:id', { id: '3' });
navigate('/login', { replace: true });
back();
forward();
```

### Active route checks

```tsx
import { isActive, isExactActive } from 'auwla/router';

isActive('/posts');      // true for /posts and /posts/3
isExactActive('/posts'); // true only for /posts
```

---

## Typed Navigation

To make `navigate()`, `<Link href>`, and `isActive()` validate against your routes, augment the `Register` interface once in your routes file:

```ts
// src/routes.ts
import { defineRoutes } from 'auwla/router';

export const routes = defineRoutes([
  { path: '/',          component: Home },
  { path: '/posts',     component: Posts },
  { path: '/posts/:id', component: PostDetail },
]);

declare module 'auwla/router' {
  interface Register {
    routes: typeof routes;
  }
}
```

With augmentation:

```ts
navigate('/posts/:id', { id: '3' }); // ✅
navigate('/posts/:id');              // ❌ missing params
navigate('/unknown');                // ❌ not a registered path
```

Without augmentation, navigation accepts any string for backward compatibility.

---

## Hooks

### `afterEach`

Runs after every committed navigation:

```ts
import { afterEach } from 'auwla/router';

afterEach((from, to) => {
  console.log(`Navigated from ${from?.path} to ${to.path}`);
});
```

---

## Named Routes with `pathFor`

Build a path string from a registered path:

```ts
import { pathFor } from 'auwla/router';

const url = pathFor('/posts/:id', { id: '3' }); // '/posts/3'
```

---

## Cache Invalidation

Routes can tag themselves in their `routed` function via `ctx.tag('name')`. Later, you can invalidate by tag or path:

```ts
import { invalidate } from 'auwla/router';

invalidate({ tags: ['posts'] });
invalidate({ path: `/posts/${postId}` });
invalidate({ path: '/posts/*' });
```

---

## Full API Reference

| Export | Description |
| :--- | :--- |
| `Router` | Route outlet component. |
| `Link` | Anchor with client-side navigation. |
| `Outlet` | Renders nested child routes. |
| `defineRoutes(routes)` | Define routes with literal path type preservation. |
| `group(path, options, routes)` | Share layout/guard across routes. |
| `composeRoutes(...routeArrays)` | Merge multiple route arrays. |
| `navigate(path, params?, opts?)` | Programmatic navigation. |
| `back()` / `forward()` | History navigation. |
| `getParams()` | Current route params. |
| `getQuery()` | Current query string object. |
| `getLocation()` | Current path string. |
| `getRouteMeta<T>()` | Current route meta object. |
| `getLoaderHandle<T>()` | Raw loader handle. |
| `getRouted(fn?)` | Typed handle inferred from the routed function. |
| `getRouteError()` | Structured error — valid only inside error components. |
| `isActive(path)` / `isExactActive(path)` | Active route checks. |
| `afterEach(fn)` | Register post-navigation hook. |
| `pathFor(path, params?)` | Build a path string. |
| `invalidate(options)` | Clear route cache by tag or path. |
| `prefetchRoute(path)` | Prefetch a route chunk. |
