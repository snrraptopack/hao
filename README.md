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

  // Direct JSX Return: clean, declarative, and AI-friendly!
  return (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}

createMemoApp(document.getElementById('app')!, <Counter />);
```

That's it. Event handlers automatically trigger re-renders.

## How It Works

- **Component functions run once for setup.** Local variables in setup are stable state.
- **Support for Two Return Styles**:
  * **Direct JSX Return (`return <JSX />`)**: Highly recommended for clean, declarative components. The compiler automatically handles render optimization and updates only the specific elements that change.
  * **Render Closure Return (`return () => <JSX />` or `return () => { ... }`)**: Useful if you need custom procedural code (like `console.log` or dynamic calculations) to run on every single render pass.
- **JSX event handlers mutate those variables directly.**
- **After an event, Auwla schedules one re-render.**
- **The re-render output is patched into the existing DOM.**
- **Elements with the same tag and `key` are reused,** so `.map()` lists preserve DOM nodes.

## Reactive Setup Scope

In Auwla, the component's setup function runs only once, but the variables declared in it are **reactive by default**. You don't need to manually import or write computed/effect wrappers. You can write flat, clean, standard JavaScript, and any **derived values** (computed properties, side-effects, dynamic bindings) will be reactively tracked automatically.

### What you write

You can write completely clean, idiomatic JavaScript:

```tsx
function Counter() {
  let count = 0;

  // Derived values are automatically detected as computed state!
  let double = count * 2;

  // Standard `if` statements in setup are compiled into side-effects!
  if (count > 5) {
    console.log('Count is getting high!');
  }

  return (
    <div>
      <button onClick={() => count++}>Count: {count}</button>
      <p>Double: {double}</p>
    </div>
  );
}
```

### What the compiler generates under the hood

The Auwla compiler automatically lowers the plain JS into fine-grained reactive blocks, wrapping derived assignments in `__computed` and reactive blocks in `__effect`:

```typescript
import { __componentBlock, __computed, __effect, __setText } from 'auwla';

function Counter() {
  const __dirty = new Set();
  const __self = __component();
  let count = 0;

  // 1. Derived assignments are wrapped in computed getters with dependency arrays
  let double = __computed(() => count * 2, ['count']);

  // 2. Setup-level reactive conditions are wrapped in side-effects
  __effect(() => {
    if (__dirty.size === 0 || __dirty.has('count')) {
      if (count > 5) {
        console.log('Count is getting high!');
      }
    }
  });

  return __componentBlock(() => {
    // ... cloned templates ...
    return __createBlock(() => ({
      node: el0,
      update() {
        const _count = __dirty.delete('count');
        if (_count) {
          __setText(text1, count); // Patches count button
        }
        __setText(text2, double()); // 3. Reads computed getter and patches double text
      }
    }));
  });
}
```

This flat, reactive setup structure allows you to build highly responsive, declarative components with zero runtime signals, boilerplate, or manual closure overhead.

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

## Automatic Commit Wrapping

Auwla includes a compile-time transform that eliminates manual `commit()` boilerplate for most asynchronous workflows and timers.

The Auwla compiler automatically identifies helper functions, timer callbacks, and `await` statements inside the setup scope that mutate setup-scoped local variables. It wraps their bodies in a `try/finally` block that calls `commit(handle)` when they finish execution, and automatically schedules a commit after every `await` resume.

### Implicit Component Handle Injection (Zero Boilerplate)

You can write completely clean, standard JavaScript without even declaring a component handle yourself. If the compiler detects that a component needs an instance handle for async/callback commits, it **automatically injects a private handle under the hood** (e.g. `const __self = __component();`) and registers the import:

```tsx
function TimerDemo() {
  let count = 0;

  // The callback mutates `count`, so the compiler automatically
  // wraps the callback and injects `__self = __component()` for you!
  const interval = setInterval(() => {
    count++;
  }, 1000);

  cleanup(() => clearInterval(interval));

  return <div>Ticks: {count}</div>;
}
```

The compiler transforms this into:

```typescript
import { component as __component, commit as __commit } from 'auwla';

function TimerDemo() {
  const __self = __component();
  let count = 0;

  const interval = setInterval(() => {
    try {
      count++;
    } finally {
      __commit(__self);
    }
  }, 1000);

  // ...
}
```

### Explicit Scoped Handling (Manual Declaration)

If you prefer to manually control your handles or want to explicitly name your component instance, you can declare a component instance handle (e.g. `const self = component()`). The compiler will respect your declared variable and use it for wrapping instead:

```tsx
import { component, cleanup } from 'auwla';

function TimerDemo() {
  const self = component(); // 1. Custom named handle
  let count = 0;

  const interval = setInterval(() => {
    count++;
  }, 1000);

  cleanup(() => clearInterval(interval));

  return <div>Ticks: {count}</div>;
}
```

### Supported Scenarios

The compiler automatically wraps:
- **Timer Callbacks:** Callbacks inside `setTimeout` or `setInterval` that mutate state.
- **Async Functions & Promises:** `async function` declarations, async event handlers, and promise callbacks that perform mutations.
- **Await Expressions:** Every `await` expression is compiled to commit on resume (`(__commit(__self), await ...)`).

### What is Ignored?

To maintain optimal performance and prevent unnecessary re-renders, the compiler ignores:
1. **No Mutations:** Functions or callbacks that do not write to or mutate setup-local variables.
2. **Manual Commits:** Functions that already contain a manual `commit(...)` call.

## Two-Way Data Binding

Auwla supports a unified, compile-time `bind={variable}` syntax for two-way data binding on form elements. Because Auwla is compiler-driven, it does not require any reactive wrappers (like signals, refs, or cells) in your state declaration. You simply bind to raw, local `let` variables in the component's setup scope.

### How it Works

During compilation, the `bind` attribute is stripped from the tag and lowered into:
1. An **initial property setter** (e.g., `element.value = variable`).
2. An **event listener** that intercepts input changes, mutates the local variable directly, and triggers invalidation.
3. A **dynamic update patch** that keeps the DOM element in sync when the variable changes from elsewhere.

```tsx
function BindingDemo() {
  let text = 'Hello';
  let checked = false;

  return () => (
    <div>
      {/* Lowered to text input value property and input listener */}
      <input type="text" bind={text} />

      {/* Lowered to checkbox checked property and change listener */}
      <input type="checkbox" bind={checked} />
    </div>
  );
}
```

---

### Supported Inputs and Element Types

| Element / Type | Target Property | Intercepted Event | Binding Behavior / Cast |
|:---|:---|:---|:---|
| `<input type="text" />` | `value` | `input` | Binds element value to string |
| `<input type="number" />` | `value` | `input` | Automatically casts to `number` |
| `<input type="range" />` | `value` | `input` | Automatically casts to `number` |
| `<input type="checkbox" />` | `checked` | `change` | Binds to a single `boolean` state |
| `<input type="checkbox" />` (Grouped) | `checked` | `change` | Binds element `value` into an `Array` or `Set` |
| `<input type="radio" />` (Grouped) | `checked` | `change` | Sets the group variable to the selected radio's `value` |
| `<select>` (Single) | `value` | `change` | Binds to the selected option value |
| `<select multiple>` | `value` | `change` | Binds to an `Array` or `Set` of selected option values |
| `<textarea>` | `value` | `input` | Binds to string content |

---

### Advanced Binding Scenarios

#### 1. Grouped Checkboxes (Arrays & Sets)
To bind multiple checkboxes to a shared collection, bind each checkbox to the same array or set variable. Checking or unchecking elements will automatically push or remove items from the collection:

```tsx
function HobbiesForm() {
  let selectedHobbies: string[] = ['coding'];

  return () => (
    <div>
      <label>
        <input type="checkbox" bind={selectedHobbies} value="coding" />
        Coding
      </label>
      <label>
        <input type="checkbox" bind={selectedHobbies} value="gaming" />
        Gaming
      </label>
      <p>Selected: {selectedHobbies.join(', ')}</p>
    </div>
  );
}
```

#### 2. Radio Groups
Grouped radio buttons are bound to a single variable. When a radio button is clicked, the variable is updated to match that radio's `value` attribute:

```tsx
function ThemeSelector() {
  let theme = 'dark';

  return () => (
    <div>
      <label>
        <input type="radio" name="theme" bind={theme} value="dark" /> Dark
      </label>
      <label>
        <input type="radio" name="theme" bind={theme} value="light" /> Light
      </label>
    </div>
  );
}
```

#### 3. Multiple Select Dropdowns
Binding a `<select multiple>` element to an array or set allows users to select multiple options:

```tsx
function FrameworkPicker() {
  let choices = ['auwla'];

  return () => (
    <select multiple bind={choices}>
      <option value="auwla">Auwla</option>
      <option value="react">React</option>
      <option value="svelte">Svelte</option>
    </select>
  );
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
| `global` | Registers the entire modifier chain as a window-level listener with automatic lifecycle cleanup. |
| `hotkey(keys)` | Fluent builder for global document-level key shortcuts. Supports modifiers (`ctrl+s`) and sequences (`g i`). |
| `intersect(options?)` | Automatically sets up a native `IntersectionObserver` on the target element. |
| `in`, `out` | Intersection direction filters. Run handler only on entry (`.in`) or exit (`.out`). |
| `silent` | Runs the handler but prevents the framework from scheduling a component re-render. Ideal for high-frequency events. |
| `trap` | Shorthand that calls both `preventDefault` and `stopPropagation` before the handler. |
| `closest(selector)` | Runs the handler only if the event target (or an ancestor) matches the CSS selector. |
| `touch` | Custom touch gesture engine. Dispatches custom events with coordinates and phase calculations. |
| `fit(min, max, step?)` | Linear interpolation modifier. Maps touch position relative to the element into a custom range. |
| `sync(obj, xProp?, yProp?)` | Updates coordinates of a target object directly on drag. |
| `moved(threshold, direction?)` | Filters pointer movements below a threshold (in pixels) for directional swipe detection. |

> [!NOTE]
> **Reactive Timing Integration**: The timing modifiers (`throttle`, `debounce`, `cooldown`) return a `Promise` representing the delayed execution of the handler. Auwla's event handler wrapper automatically intercepts this promise and defers component invalidation until the promise resolves. This prevents premature renders while waiting for throttled or debounced events.

### Global Listeners & Hotkeys

Global listeners registered via `.global` or `event.hotkey()` are automatically bound to the window/document and will cleanly unbind themselves when the mounting component unmounts.

```tsx
// Global Click Outside detector
event.click.global.handler((e) => {
  if (panel && !panel.contains(e.target)) {
    closePanel();
  }
});

// Global Hotkeys (supports modifiers and sequencing)
event.hotkey('ctrl+s').prevent.handler(saveDocument);
event.hotkey('esc').handler(closeAllModals);
event.hotkey('g i').handler(goToInbox); // sequence: press 'g' then 'i'
```

### Scroll & Intersection Observers

The `.intersect` modifier configures and attaches a native `IntersectionObserver` to the element upon mount. You can pass a threshold number (`0` to `1.0`) or a standard `IntersectionObserverInit` options object.

```tsx
// Trigger when Box enters the viewport (defaults to 0% visible)
<div onIntersect={event.intersect().in.handler(handleEnter)} />

// Trigger when Box exits the viewport
<div onIntersect={event.intersect().out.handler(handleExit)} />

// Custom threshold (50% visibility)
<div onIntersect={event.intersect(0.5).in.handler(handleFiftyPercent)} />

// Custom scrolling root and margins
<div onIntersect={
  event.intersect({
    root: scrollContainer,
    threshold: [0, 1.0],
    rootMargin: '10px'
  }).handler(handleIntersectionChange)
} />
```

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

### Touch Gestures & Pointer Tracking

Auwla includes a first-class gesture system using `.touch`. When a touch gesture starts, pointer coordinates are captured and tracked:

```tsx
// 1. Direct coordinate synchronization on drag
<div 
  class="draggable-card"
  onTouch={event.touch.sync(position, 'x', 'y').handler(() => {
    // Component is automatically re-rendered with the updated position properties
  })}
/>

// 2. Linear interpolation (.fit)
// Maps the element's local coordinates (0 to 1) onto a custom scale (e.g. 0 to 100)
<div 
  class="slider"
  onTouch={event.touch.fit(0, 100).handler((e) => {
    sliderValue = e.detail.x; 
  })}
/>

// 3. Swipe gesture filtering (.moved)
// Prevents small, accidental tremors from triggering swipe actions
<div 
  class="swipe-pad"
  onTouch={
    event.touch.moved(40, 'left').handler(() => {
      showToast('Swiped Left!');
    })
    .touch.moved(40, 'right').handler(() => {
      showToast('Swiped Right!');
    })
  }
/>
```

### Advanced Layout and Render Controls

For high-frequency events or complex trees, you can control re-renders and delegate targets natively:

```tsx
// 1. Silent handlers (no re-renders)
// Runs the handler but blocks the framework from scheduling a component update.
<div onMouseMove={event.silent.handler((e) => {
  const counter = document.getElementById('hover-coords');
  if (counter) counter.innerText = `${e.clientX}, ${e.clientY}`;
})} />

// 2. Event Trapping
// Stops propagation and prevents browser defaults.
<button onClick={event.trap.handler(() => {
  showToast('Action performed!');
})}>
  Click Me
</button>

// 3. Ancestor Event Delegation (.closest)
// Evaluates the handler only if the target matches or is nested inside a selector.
<ul onClick={event.closest('.item-btn').handler((e) => {
  const button = e.target.closest('.item-btn');
  console.log("Clicked button", button);
})}>
  <li><button class="item-btn">Item 1</button></li>
  <li><button class="item-btn">Item 2</button></li>
</ul>
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
  getRouted, getRouteMeta,
  isActive, isExactActive,
  Link,
} from 'auwla/router';
```

The router is built directly on the runtime's reactivity: URL changes invalidate only the components that read route state.

### File-based routing

Use the `auwlaRouter()` Vite plugin to generate routes from a `src/pages` directory:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { auwla } from 'auwla/vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [auwla(), auwlaRouter({ dir: 'src/pages' })],
})
```

```tsx
// src/App.tsx
import { Router } from 'auwla/router'
import routes from 'auwla:routes'

export default function App() {
  return () => <Router routes={routes} suspend />
}
```

Pages are matched by file name:

```
src/pages/
  index.tsx          → /
  about.tsx          → /about
  posts/
    index.tsx        → /posts
    [id].tsx         → /posts/:id
  [...404].tsx       → /*
```

Optional named exports become route fields: `routed`, `pending`, `error`, `guard`, `meta`.

### Route parameters and query

```tsx
function PostDetail() {
  const { id } = getParams('/posts/:id')  // { id: string }
  const query = getQuery()                 // ?tab=comments → { tab: 'comments' }
  const loc = getLocation()                // '/posts/42?tab=comments'

  return () => <h1>Post {id}</h1>
}
```

### Navigation

```tsx
<Link href="/posts">Posts</Link>
<Link href="/posts/:id" params={{ id: '3' }}>View</Link>

navigate('/posts')
navigate('/login', { replace: true })
back()
forward()
```

### Route-level data loading with `routed`

Export an async `routed` function from a page file. The router runs it on navigation and exposes the result via `getRouted(routed)`:

```tsx
import { getRouted, type RouteContext } from 'auwla/router'
import { track } from 'auwla/track'

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

Navigating away cancels the in-flight loader. With `<Router suspend>` the previous route stays visible until the new route's data resolves.

See [ROUTER.md](./ROUTER.md) for the full API (`group`, `Outlet`, guards, meta, typed navigation, etc.).

---

### Dynamic HTML `<head>` Management

Auwla supports native, type-safe HTML `<head>` tag hoisting directly inside your JSX pages and components. There's no need for external libraries or custom wrappers—just use the standard HTML `<head>` tag and its children (`<title>`, `<meta>`, `<link>`, etc.) anywhere in your component tree:

```tsx
export default function BlogPost() {
  return (
    <div>
      <head>
        <title>Auwla - Isomorphic Head Management</title>
        <meta name="description" content="Auwla handles head elements natively!" />
        <link rel="canonical" href="https://auwla.dev/blog" />
      </head>
      
      <main>
        <h1>Dynamic Head Hoisting</h1>
        <p>Auwla handles head elements on both the server and client automatically.</p>
      </main>
    </div>
  );
}
```

#### How It Works:
* **Server-Side Rendering (SSR):** The SSR engine intercepts the `<head>` tags, extracts their HTML content, and cleanly injects them before the closing `</head>` tag of the main HTML shell.
* **Client-Side Navigation (CSR):** On page mount, Auwla automatically hoists all children of the `<head>` element into the browser's real `document.head`.
* **Automatic Cleanup:** When navigation occurs or the component unmounts, Auwla automatically cleans up the hoisted elements to prevent tag duplicates or stale metadata.

---

### Router Accessibility & Title Synchronization

Auwla's client-side router includes built-in accessibility helpers to ensure a smooth transition experience for assistive technologies (such as screen readers):
* **Automatic Focus Reset:** On route transitions, the router automatically shifts keyboard focus to the first `<main>` element, `<h1>` heading, or the application container. This prompts screen readers to announce the new page content immediately.
* **Title Synchronization:** If a route is configured with `meta.title` in your routing configuration, the router automatically updates the browser tab title (`document.title`) on transitions.

---

## Server functions

Auwla gives you type-safe RPC without importing server files on the client.

### Server files

Files ending in `.server.ts` run only on the server. Each export becomes an RPC endpoint keyed as `fileName.exportName`.

```ts
// src/pages/posts/[id].server.ts
import { remote, getParams } from 'auwla/server'

export const getPost = remote.get(async () => {
  const { id } = getParams()   // typed as { id: string }
  return db.post.findById(id)
})
```

Use `remote.get()`, `remote.post()` or a plain async function (defaults to GET). Pass middleware arrays to `remote.<method>()` for validation, auth, etc.

### Validation middleware

```ts
import { remote, validate } from 'auwla/server'
import * as v from 'valibot'

const schema = v.object({ title: v.string() })

export const createPost = remote.post(
  [validate(schema)],
  async (ctx) => {
    const { title } = ctx.locals.input as { title: string }
    return db.post.create({ title })
  },
)
```

### Calling server functions from the client

Use `track.get()` / `track.post()` with the generated key:

```tsx
import { track } from 'auwla/track'

const posts = track.get('posts.getPosts')

return () => (
  <main>
    {posts.pending && <p>Loading…</p>}
    {posts.resolved && posts.value.map((p) => <p>{p.title}</p>)}
  </main>
)
```

The returned `TrackHandle` is the same reactive primitive used for local async work: `.pending`, `.resolved`, `.rejected`, `.value`, `.reason`, `.refresh()`, `.cancel()`.

### Forms

Bind a form directly to a POST remote with `track.form()`:

```tsx
import { track } from 'auwla/track'
import type { StandardSchema } from 'auwla/server'

const schema: StandardSchema = {
  '~standard': {
    validate: (value) => {
      if (value && typeof (value as any).title === 'string') {
        return { value }
      }
      return { issues: [{ message: 'title is required' }] }
    },
  },
}

export default function NewPostPage() {
  const create = track.form('posts.createPost', { schema })

  return () => (
    <form onSubmit={create.onSubmit}>
      <input name="title" required />
      <button disabled={create.pending}>
        {create.pending ? 'Saving…' : 'Save'}
      </button>
      {create.error && <p>{create.error.message}</p>}
      {create.resolved && <p>Created: {create.value.title}</p>}
    </form>
  )
}
```

`track.form()` intercepts submit, runs client-side schema validation, sends `FormData` to the server, and exposes the same lifecycle state as `track.post()`.

### Mounting the RPC adapter

You own the server. Mount the adapter at `/_auwla/rpc`:

```ts
// Bun
import { createBunAdapter } from 'auwla/adapters/bun'
Bun.serve({ fetch: createBunAdapter() })
```

```ts
// Hono
import { Hono } from 'hono'
import { createHonoAdapter } from 'auwla/adapters/hono'
const app = new Hono()
app.use('/_auwla/*', createHonoAdapter())
```

```ts
// Express
import express from 'express'
// Express adapter is deferred; use createFetchAdapter or createHonoAdapter for now
import { createFetchAdapter } from 'auwla/adapters/fetch'
const app = express()
app.use('/_auwla', createFetchAdapter())
```

During `vite dev`, `auwlaRouter()` handles the RPC endpoint automatically — no separate server is needed in development.

---

## Codebase Docs

- [COMPILER.md](./COMPILER.md) describes the compiler strategy and generated helper targets.
- [ROUTER.md](./ROUTER.md) is the full router reference.
- [SSR_PLAN.md](./SSR_PLAN.md) tracks the SSR implementation plan.
- [ssr.md](./ssr.md) outlines the SSR architecture proposal.

The experimental compiler transform is available from `auwla/compiler` for tooling. Runtime apps do not need to import it.
