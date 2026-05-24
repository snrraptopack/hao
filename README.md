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

## External Async Data

For data that resolves outside an Auwla event handler, mutate plain variables and call `commit()`.

```tsx
import { commit, createMemoApp } from 'auwla';

function UserProfile() {
  let user: { name: string; email: string } | null = null;
  let error = '';

  fetch('/api/user')
    .then((res) => res.json())
    .then((data) => {
      user = data;
      commit();
    })
    .catch((err) => {
      error = String(err);
      commit();
    });

  return () => (
    <section>
      {error && <p>{error}</p>}
      {!user && !error && <p>Loading...</p>}
      {user && (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      )}
    </section>
  );
}

createMemoApp(document.getElementById('app')!, <UserProfile />);
```

`commit()` is a global invalidation event. It schedules one rerender for every mounted Auwla app.

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

## API

```ts
createMemoApp(root, <App />);
commit();
```

The lower-level DOM helpers are exported for tests and advanced usage:

```ts
import { h, Fragment, createMemoElement } from 'auwla';
```
