# Auwla

A tiny typed DOM runtime for JSX apps with event-driven rerendering and DOM reuse.

There are no hooks, refs, signals, stores, or framework-specific list/conditional components. State is plain JavaScript held in component closures.

## Install

```bash
npm install auwla
```

## Quick Start

```tsx
import { createMemoApp } from 'auwla';

function Counter() {
  let count = 0;

  return () => (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}

createMemoApp(document.getElementById('app')!, <Counter />);
```

That's it. Event handlers automatically trigger re-renders

## How It Works

- **Component functions run once for setup.**
- **A component returns a render closure** that runs on every re-render.
- **Local variables in setup are stable state.**
- **JSX event handlers mutate those variables directly.**
- **After an event, Auwla schedules one re-render.**
- **The re-render output is patched into the existing DOM.**
- **Elements with the same tag and `key` are reused,** so `.map()` lists preserve DOM nodes.

## Manual Commit

Events auto-commit, but external async work (fetch, setTimeout, WebSocket) needs an explicit `commit()`:

```tsx
import { commit } from 'auwla';

function FetchUsers() {
  let users: User[] = [];
  let loading = true;

  fetch('/api/users')
    .then((r) => r.json())
    .then((data) => { users = data; })
    .finally(() => {
      loading = false;
      commit(); // trigger re-render
    });

  return () => (
    <div>
      {loading ? <p>Loading...</p> : (
        <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
      )}
    </div>
  );
}
```

## Scoped Re-rendering with `component()`

Call `component()` in setup to get a handle. Pass it to `commit()` to re-render only that component instead of the whole app:

```tsx
import { component, commit } from 'auwla';

function LiveClock() {
  const self = component();
  let time = new Date().toLocaleTimeString();

  setInterval(() => {
    time = new Date().toLocaleTimeString();
    commit(self); // only this component re-renders
  }, 1000);

  return () => <p>{time}</p>;
}
```

## Todo Example

```tsx
function TodoApp() {
  const todos = [{ id: 1, text: 'Learn Auwla', done: false }];
  let newTodoText = '';

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text, done: false });
    newTodoText = '';
  }

  return () => (
    <div class="todo-container">
      <form class="row" onSubmit={handleSubmit}>
        <input
          value={newTodoText}
          placeholder="Add a task"
          onInput={(event) => {
            newTodoText = (event.target as HTMLInputElement).value;
          }}
        />
        <button type="submit">Add</button>
      </form>

      {todos.length === 0 && <p>All tasks completed!</p>}

      <ul class="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} class={todo.done ? 'completed' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => { todo.done = !todo.done; }}
              />
              <span>{todo.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

createMemoApp(document.getElementById('app')!, <TodoApp />);
```

## Async Lifecycle Tracking

You can use `commit()` for data loading stuff but we have `event.track` which abstract the manual `commit` for you and it something you can watch or react to gloabaly making it ideal for things like global loading .

```tsx
import { event } from 'auwla/events';

function UserProfile() {
  let user: { name: string; email: string } | null = null;

  const loadUser = event.track('user', fetch('/api/user').then((r) => r.json()));
  loadUser.then((data) => { user = data; });

  return () => (
    <section>
      {loadUser.pending && <p>Loading...</p>}
      {loadUser.rejected && <p>Error: {String(loadUser.reason)}</p>}
      {loadUser.resolved && (
        <div>
          <h2>{user!.name}</h2>
          <p>{user!.email}</p>
        </div>
      )}
    </section>
  );
}
```

The returned handle is **thenable** — you can chain `.then()` and `.catch()` — and has reactive state getters that can be read directly in render closures:

| Property | Meaning |
|---|---|
| `.pending` | The operation is in-flight |
| `.resolved` | The operation succeeded |
| `.rejected` | The operation failed |
| `.value` | The resolved value |
| `.reason` | The rejection reason |
| `.status` | `'idle'` \| `'pending'` \| `'resolved'` \| `'rejected'` |
| `.cancel()` | Abort an in-flight operation |

### Async Functions (Auto-Cancel)

Pass an async function and it starts immediately. Calling `event.track()` again with the same name auto-cancels the previous run:

```tsx
function Search() {
  let results: string[] = [];
  let query = '';

  const searchPosts = () => {
    event.track('posts', async (signal) => {
      const res = await fetch(`/api/search?q=${query}`, { signal });
      results = await res.json();
    });
  };

  return () => (
    <div>
      <input
        value={query}
        onInput={(e) => {
          query = (e.target as HTMLInputElement).value;
          searchPosts();
        }}
      />
      {event.pending('posts') && <span>Searching...</span>}
      {results.map((r) => <div key={r}>{r}</div>)}
    </div>
  );
}
```

No manual `AbortController` management — race conditions are handled automatically.

### Global Queries

Query or cancel tracks from anywhere:

```tsx
event.pending('user');       // is this specific track pending?
event.pending();             // is ANY track pending in this component?
event.cancel('upload');      // cancel by name
event.value<{ name: string }>('user')?.name;  // get resolved value
```

## Event Modifiers

Import `event` from `auwla/events` when you want chainable event helpers instead of writing the same boilerplate inside every handler:

```tsx
import { event } from 'auwla/events';

function SearchForm() {
  let query = '';
  let submitted = '';

  return () => (
    <form
      onSubmit={event.prevent.if(() => query.trim() !== '').handler(() => {
        submitted = query;
      })}
    >
      <input
        value={query}
        onInput={event.input.debounce(250).handler((inputEvent) => {
          query = (inputEvent.target as HTMLInputElement).value;
        })}
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

Modifiers run left-to-right as a chain around the final handler. For mutable component state, pass a predicate to `if`: `event.if(() => canSave)`. A plain boolean such as `event.if(canSave)` is a snapshot from the render where the chain was created.

| Modifier | Use |
| --- | --- |
| `prevent` | Calls `event.preventDefault()` before the handler. |
| `stop` | Calls `event.stopPropagation()` before the handler. |
| `stopImmediate` | Calls `event.stopImmediatePropagation()` before the handler. |
| `once` | Runs the handler only once for that chain instance. |
| `self` | Runs only when the composed event origin is the current target. |
| `trusted` | Runs only for browser-trusted user events. |
| `if(condition)` | Runs only when a boolean or predicate condition allows it. |
| `target(selectorOrPredicate)` | Runs only when the event origin matches a selector or predicate. |
| `key(key)` | Runs only for matching keyboard keys. Accepts a string or array. |
| `mod`, `ctrl`, `meta`, `shift`, `alt` | Keyboard modifier filters. |
| `left`, `middle`, `right` | Mouse button filters for mouse/pointer-style events with a `button` value. |
| `debounce(ms)`, `throttle(ms)`, `cooldown(ms)` | Timing modifiers. Defaults use the built-in event delay. |
| `log(label?)` | Logs the event, optionally with a label, then continues. |

Common chains:

```tsx
<button onClick={event.once.prevent.handler(save)}>Save once</button>

<div onClick={event.target('button[data-action]').handler((clickEvent) => {
  const action = (clickEvent.target as HTMLElement).dataset.action;
})}>
  <button data-action="archive">Archive</button>
  <button data-action="delete">Delete</button>
</div>

<input onKeyDown={event.key('Enter').prevent.handler(submit)} />

<button onMouseDown={event.left.handler(select)}>Primary click only</button>

<div onPointerMove={event.pointerMove.throttle(80).handler(trackPointer)} />
```

## TypeScript Setup

Use the automatic JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "auwla"
  }
}
```

## Vite Plugin

Use the  compiler plugin when you want Auwla render closures lowered to direct DOM blocks at build time:

```ts
import { defineConfig } from 'vite';
import { auwla } from 'auwla/vite';

export default defineConfig({
  plugins: [auwla()],
});
```

## API

```ts
createMemoApp(root, <App />);
commit();        // re-render all mounted apps
commit(handle);  // re-render only one component subtree
component();     // get a component handle for scoped commit / emit
```

The lower-level DOM helpers are exported for tests and advanced usage:

```ts
import { h, Fragment, createMemoElement } from 'auwla';
```

## Router

Auwla ships a client-side router as a separate entry point. Import everything from `auwla/router`.

```ts
import {
  Router, defineRoutes, navigate, back, forward,
  getParams, getQuery, getLocation,
  getLoaderHandle, getRouteMeta,
  isActive, isExactActive,
  Link,
} from 'auwla/router';
```

### Core Architecture

The Auwla router is built directly on the runtime's reactivity:
- **Single Source of Truth**: The current path is stored in a global reactive cell.
- **Lockstep Updates**: Any component or router reading the path is automatically subscribed to path changes.
- **Multiple Routers**: You can render more than one `<Router />` on the page. Since they all subscribe to the same reactive state, they all update synchronously in the same render tick without conflicts.

### Defining Routes

```tsx
import { defineRoutes, Router } from 'auwla/router';

defineRoutes([
  { path: '/',          component: Home     },
  { path: '/posts',     component: PostList },
  { path: '/posts/:id', component: PostDetail },
  { path: '*',          component: NotFound },
]);

function App() {
  return () => <Router />;
}
```

`<Router />` renders the component for the currently matched path. A `*` route acts as a 404 fallback.

### First-Class Layout Components

Layouts are wrapped around routes (usually applied via `group()`). Layouts receive the route component constructor (`Child`) and render it natively as a standard JSX element:

```tsx
import { group, RouteComponent } from 'auwla/router';

// 1. Define the layout shell rendering <Child />
export function AppLayout(Child: RouteComponent) {
  return () => (
    <div class="app-layout">
      <nav>...</nav>
      <main>
        <Child />
      </main>
    </div>
  );
}

// 2. Apply it to a group of routes
defineRoutes([
  ...group('/admin', { layout: AppLayout }, [
    { path: '/', component: Dashboard },
    { path: '/settings', component: Settings },
  ])
]);
```

### Local / Scoped Routers

You can pass a local route list to a router using the `routes` prop. This is ideal for nested sub-layouts (like dashboard tabs) or isolated component testing:

```tsx
const tabRoutes = [
  { path: '/dashboard/profile', component: ProfileTab },
  { path: '/dashboard/billing', component: BillingTab }
];

function DashboardLayout() {
  return () => (
    <div class="dashboard">
      <TabNav />
      {/* Only matches and renders within tabRoutes */}
      <Router routes={tabRoutes} />
    </div>
  );
}
```

### Route Parameters and Query

```tsx
import { getParams, getQuery, getLocation } from 'auwla/router';

function PostDetail() {
  // Safe to call anywhere in setup — the router creates a fresh component
  // instance when the path changes, so these values are stable for the component lifecycle.
  const { id } = getParams();     // /posts/42         → { id: '42' }
  const query   = getQuery();     // ?tab=comments     → { tab: 'comments' }
  const loc     = getLocation();   // '/posts/42?tab=comments'

  return () => <h1>Post {id}</h1>;
}
```

`getParams()`, `getQuery()`, and `getLocation()` read from the reactive state the Router sets on every match.

### Navigation

```tsx
import { navigate, back, forward } from 'auwla/router';

navigate('/posts');                    // push a new history entry
navigate('/login', { replace: true }); // replace the current entry (no back-stack entry)
back();
forward();
```

`navigate()` prefers the Navigation API where available and falls back to the History API automatically.

### Loaders

Add a `loader` to a route to fetch data before the component renders. The router starts it immediately, wires a cancellation signal, and exposes the result via `getLoaderHandle<T>()`.

```tsx
defineRoutes([{
  path: '/posts/:id',
  loader: (ctx, signal) =>
    fetch(`/api/posts/${ctx.params.id}`, { signal }).then(r => r.json()),
  component: PostDetail,
}]);

function PostDetail() {
  const loader = getLoaderHandle<Post>();

  if (loader?.pending)  return <p>Loading…</p>;
  if (loader?.rejected) return <p>Error: {String(loader.reason)}</p>;

  const post = loader?.value; // typed as Post | undefined

  return () =>(
    <h1>{post?.title}</h1>;
  )
}
```

Navigating away while a load is in-flight automatically cancels it.

### Navigation Guards

`beforeEnter` runs before the component renders. Return `false` to block, or a path string to redirect:

```tsx
defineRoutes([{
  path: '/dashboard',
  beforeEnter: (ctx) => isLoggedIn() || '/login',
  component: Dashboard,
}]);
```

### Route Meta

Attach arbitrary data to any route with `meta`:

```tsx
defineRoutes([{
  path: '/admin',
  meta: { requiresAuth: true, title: 'Admin Panel' },
  component: Admin,
}]);

// Read in any component or beforeEnter guard:
const { requiresAuth } = getRouteMeta<{ requiresAuth: boolean; title: string }>();
```

### Active Link Detection

```tsx
import { isActive, isExactActive } from 'auwla/router';

// isActive('/posts') → true on /posts AND /posts/42 (prefix match)
// isExactActive('/posts') → true only on /posts exactly
```

### Link Component

`<Link>` is a drop-in replacement for `<a>` that calls `navigate()` on click and automatically applies active classes:

```tsx
import { Link } from 'auwla/router';

// Renders with class="active exact-active" on /posts exactly
<Link href="/posts">Posts</Link>

// Custom class names:
<Link href="/posts" activeClass="is-active" exactActiveClass="is-current">
  Posts
</Link>
```

Modifier-key clicks (Ctrl, Meta, Shift, Alt) are passed through to the browser so "open in new tab" keeps working.

### Nested Routes

A route with `children` is flattened. If the parent also has a `component`, it is kept as its own renderable entry:

```tsx
defineRoutes([{
  path: '/settings',
  children: [
    { path: '/profile',  component: ProfilePage  },
    { path: '/security', component: SecurityPage },
  ],
}]);
// Registers /settings/profile and /settings/security
```

### Testing Utilities

```ts
import { resetRoutes } from 'auwla/router';

beforeEach(() => resetRoutes()); // clear the registry between tests
```

## Codebase Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) explains the runtime/compiler module boundaries and render flow.
- [COMPILER.md](./COMPILER.md) describes the compiler strategy and generated helper targets.
- [ROADMAP.md](./ROADMAP.md) tracks implementation priorities.

The experimental compiler transform is available from `auwla/compiler` for tooling. Runtime apps do not need to import it.
