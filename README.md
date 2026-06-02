# Auwla

A tiny typed DOM runtime for JSX apps with event-driven rerendering and DOM reuse.

There are no hooks, refs, signals, stores, routers, or framework-specific list/conditional components. State is plain JavaScript held in component closures.

## DX

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

## Todo Example

```tsx
function TodoApp() {
  const todos = [{ id: 1, text: 'Learn Auwla', done: false }];
  let newTodoText = '';

  return () => (
    <div class="todo-container">
      <form onSubmit={(event) => {
        event.preventDefault();
        const text = newTodoText.trim();
        if (!text) return;
        todos.push({ id: Date.now(), text, done: false });
        newTodoText = '';
      }}>
        <input
          value={newTodoText}
          onInput={(event) => {
            newTodoText = (event.target as HTMLInputElement).value;
          }}
        />
        <button type="submit">Add Task</button>
      </form>

      {todos.length === 0 && <p>All tasks completed!</p>}

      <ul>
        {todos.map((todo) => (
          <li key={todo.id} class={todo.done ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => { todo.done = !todo.done; }}
            />
            <span>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

createMemoApp(document.getElementById('app')!, <TodoApp />);
```

## Async Lifecycle Tracking

Wrap any promise or async function with `event.track()` and the framework observes its lifecycle, auto-committing renders on every transition.

```tsx
import { event } from 'auwla/events';

function UserProfile() {
  let user: { name: string; email: string } | null = null;

  const loadUser = event.track('user', fetch('/api/user').then((r) => r.json()));
  loadUser.then((data) => {
    user = data;
  });

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

The returned handle is **thenable** — you can chain `.then()` and `.catch()` just like a normal promise — and has reactive state getters that can be read directly in render closures.

| Handle Property | Meaning |
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

### Manual commit (fallback)

For truly external async work that you don't want to track, mutate plain variables and call `commit()`:

```tsx
import { commit } from 'auwla';

fetch('/api/config').then((data) => {
  config = data;
  commit();
});
```

## How It Works

- Component functions run once for setup.
- A component returns a render closure.
- Local variables in setup are stable state.
- JSX event handlers mutate those variables directly.
- After an event, Auwla schedules one rerender.
- The rerender output is patched into the existing DOM.
- Elements with the same tag and `key` are reused, so `.map()` lists preserve DOM nodes.
- Props, text, event listeners, and children are patched in place.

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

Use the optional compiler plugin when you want Auwla render closures lowered to direct DOM blocks at build time:

```ts
import { defineConfig } from 'vite';
import { auwla } from 'auwla/vite';

export default defineConfig({
  plugins: [auwla()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'auwla',
  },
});
```

## Event Modifiers

Import `event` from `auwla/events` when you want chainable event helpers instead of writing the same event boilerplate inside every handler:

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

## API

```ts
createMemoApp(root, <App />);
commit();
```

The lower-level DOM helpers are exported for tests and advanced usage:

```ts
import { h, Fragment, createMemoElement } from 'auwla';
```

## Codebase Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) explains the runtime/compiler module boundaries and render flow.
- [COMPILER.md](./COMPILER.md) describes the compiler strategy and generated helper targets.
- [ROADMAP.md](./ROADMAP.md) tracks implementation priorities.

The experimental compiler transform is available from `auwla/compiler` for tooling. Runtime apps do not need to import it.
