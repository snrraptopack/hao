# Working With State

State in Auwla is plain JavaScript. There are no wrappers to import, no constructors to call, and no markers to apply. A variable declared in the component setup scope is state. If it changes, the next render will reflect the new value.

---

## The Basics

The simplest component is a counter. A `let` variable, mutated directly inside a click handler:

```tsx [Counter.tsx]
function Counter() {
  let count = 0;

  return () => (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}
```

The component function runs once. It sets up `count` as a plain variable and returns a render closure. Every time the button is clicked, `count++` runs inside an event handler. Auwla wraps every JSX event handler at compile time with an invalidation step, so after the handler completes, the render closure re-runs, reads the new value of `count`, and patches just the text node that changed.

Nothing reactive about the variable. The event is the boundary.

---

## Objects, Arrays, and Derived Values

Because state is just JavaScript, objects and arrays work exactly as you would expect. Mutate in place and Auwla re-renders:

```tsx [TodoList.tsx]
function TodoList() {
  const todos: { id: number; text: string; done: boolean }[] = [];
  let input = '';

  function add() {
    if (!input.trim()) return;
    todos.push({ id: Date.now(), text: input, done: false });
    input = '';
  }

  return () => (
    <div>
      <input
        value={input}
        onInput={(e) => { input = (e.target as HTMLInputElement).value; }}
      />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => { t.done = !t.done; }}
            />
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Keys in lists must be stable identifiers from the data, never the array index. When items are reordered or removed, an index key changes for surviving items and Auwla would treat them as new nodes. A stable `id` from the data tells Auwla which DOM node belongs to which item and reuses it correctly.

Derived values require no wrappers either. Declare them in setup scope and the compiler tracks what they depend on:

```tsx [Stats.tsx]
function Stats() {
  const scores: number[] = [10, 20, 30];

  let total   = scores.reduce((a, b) => a + b, 0);
  let average = scores.length ? total / scores.length : 0;

  return () => (
    <div>
      <p>Total: {total}</p>
      <p>Average: {average.toFixed(1)}</p>
    </div>
  );
}
```

The compiler detects that `total` and `average` depend on `scores` and compiles them into tracked computations. When `scores` changes, they update. You do not write that tracking yourself.

---

## When Auwla Does Not Know About a Change

Event handlers are where Auwla expects mutations to happen. The compile-time wrapper is placed there, so any mutation inside a click, input, submit, or any other JSX event handler automatically schedules a re-render.

But not every mutation comes from an event handler. Consider a fetch:

```tsx [UserCard.tsx]
function UserCard() {
  let user: { name: string; email: string } | null = null;

  fetch('/api/user')
    .then((r) => r.json())
    .then((data) => {
      user = data; // this runs outside any event handler
    });

  return () => (
    <div>
      {user ? <p>{user.name}</p> : <p>Loading...</p>}
    </div>
  );
}
```

This does not work as written. The fetch resolves asynchronously, outside any event boundary Auwla knows about. `user` gets assigned, but no re-render is scheduled because nothing told Auwla a change happened.

---

## `commit()`: Telling Auwla Something Changed

For mutations that happen outside event handlers, Auwla provides `commit()`. Calling it schedules a re-render across all mounted components:

```tsx [UserCard.tsx]
import { commit } from 'auwla';

function UserCard() {
  let user: { name: string; email: string } | null = null;

  fetch('/api/user')
    .then((r) => r.json())
    .then((data) => {
      user = data;
      commit(); // tell Auwla something changed
    });

  return () => (
    <div>
      {user ? <p>{user.name}</p> : <p>Loading...</p>}
    </div>
  );
}
```

Now the fetch resolves, `user` is set, `commit()` fires, and the component re-renders with the new data. The same applies to `setTimeout`, `setInterval`, WebSocket message handlers, or any other async boundary:

```tsx [Ticker.tsx]
import { commit } from 'auwla';

function Ticker() {
  let time = new Date().toLocaleTimeString();

  setInterval(() => {
    time = new Date().toLocaleTimeString();
    commit();
  }, 1000);

  return () => <p>{time}</p>;
}
```

---

## `commit()` Re-renders Everything

`commit()` with no arguments re-renders every mounted component in the application. For a small app that is fine. For a larger app where only one component changed, it is unnecessary work.

Consider a dashboard with a live clock in the corner. Every second, `commit()` fires and every component on the page re-evaluates, even components that have nothing to do with the time:

```tsx [Dashboard.tsx]
import { commit } from 'auwla';

function LiveClock() {
  let time = new Date().toLocaleTimeString();

  setInterval(() => {
    time = new Date().toLocaleTimeString();
    commit(); // re-renders the entire application every second
  }, 1000);

  return () => <p>{time}</p>;
}
```

This works, but it is broader than it needs to be.

---

## `component()`: Scoped Re-renders

`component()` returns a stable handle for the current component instance. Passing that handle to `commit()` re-renders only that component's subtree instead of the whole application:

```tsx [LiveClock.tsx]
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

Now the clock updates every second and nothing else in the application is touched.

The same pattern applies to fetch:

```tsx [UserCard.tsx]
import { component, commit } from 'auwla';

function UserCard() {
  const self = component();
  let user: { name: string; email: string } | null = null;

  fetch('/api/user')
    .then((r) => r.json())
    .then((data) => {
      user = data;
      commit(self);
    });

  return () => (
    <div>
      {user ? <p>{user.name}</p> : <p>Loading...</p>}
    </div>
  );
}
```

Use `commit()` when you genuinely want every component to re-evaluate, for example after a global state change like a user logging out. Use `commit(self)` when only this component's data changed.

---

## The Compiler Removes the Boilerplate

Calling `commit(self)` in every async function and timer callback is accurate, but it is also repetitive. Auwla's compiler can eliminate it.

When it sees `component()` assigned to a variable in setup scope, it knows the component wants scoped re-renders. It then looks at every async function and timer callback in that setup scope and checks whether any of them mutate setup-scoped variables. For the ones that do, it wraps the body in a `try/finally` block that calls `commit(self)` automatically:

```tsx [LiveClock.tsx]
import { component } from 'auwla';

function LiveClock() {
  const self = component(); // the compiler sees this

  let time = new Date().toLocaleTimeString();

  // the compiler sees that this callback mutates `time`,
  // which is a setup-scoped variable, so it injects commit(self) automatically
  setInterval(() => {
    time = new Date().toLocaleTimeString();
  }, 1000);

  return () => <p>{time}</p>;
}
```

The compiler transforms the `setInterval` callback to:

```ts
setInterval(() => {
  try {
    time = new Date().toLocaleTimeString();
  } finally {
    commit(self);
  }
}, 1000);
```

You write clean code. The compiler handles the re-render scheduling. The same applies to async functions:

```tsx [UserCard.tsx]
import { component } from 'auwla';

function UserCard() {
  const self = component();
  let user: { name: string; email: string } | null = null;

  // the compiler detects that loadUser is async and mutates `user`,
  // so it injects commit(self) in a try/finally after the await settles
  async function loadUser() {
    const r = await fetch('/api/user');
    user = await r.json();
  }

  loadUser();

  return () => (
    <div>
      {user ? <p>{user.name}</p> : <p>Loading...</p>}
    </div>
  );
}
```

The compiler ignores functions that do not mutate setup variables, and it ignores functions that already contain a manual `commit()` call. It only acts where the injection is actually needed.

> [!NOTE]
> The compiler transform requires `component()` to be assigned to a local variable in setup scope. Without that assignment, the compiler has no named target for `commit()` and skips the transform entirely. If you see async mutations not triggering re-renders, check that `const self = component()` is present.

---

## How Re-renders Actually Propagate

When a re-render is scheduled, whether by an event handler, `commit()`, or `commit(self)`, it is worth understanding what actually gets re-evaluated.

Auwla re-renders from the component that was invalidated downward. A parent re-rendering does not automatically re-render all of its children. Only children that consume data that changed will re-evaluate. Children that do not depend on anything that changed are skipped entirely, because their previous render output is still valid.

The reverse is also true: if a child re-renders and it has hoisted state that a parent uses, the parent will re-evaluate to make sure that state is computed correctly. This sounds expensive but it is not. Auwla memoizes render output at the node level. When a parent re-evaluates because a child triggered it, the parent does not blow away its own DOM. Only the specific nodes whose values actually changed get patched. Everything else is compared and left alone.

The practical result is that you do not need to think carefully about re-render boundaries the way you might in React. You do not need `React.memo`, `useMemo` to stabilize props, or `useCallback` to prevent child re-renders. The runtime handles that at the DOM patch level, not at the component boundary level.

---

## Summary

| Situation | What to do |
| :--- | :--- |
| Mutation inside a JSX event handler | Nothing. Auwla re-renders automatically. |
| Mutation in a `fetch`, `setTimeout`, or `setInterval` | Call `commit()` after the mutation. |
| Same as above, but only this component should re-render | Call `commit(self)` using a handle from `component()`. |
| Same as above, and you want the compiler to handle it | Import `component`, assign `const self = component()`, write your async function normally. |
| Global state change that every component should see | Call `commit()` with no arguments. |

In the next section, [Shared State](/docs/shared-state) covers `reactive()` cells and class singletons for state that lives outside any single component.