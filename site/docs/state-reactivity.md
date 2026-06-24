# State & Reactivity

Before learning how Auwla works, it helps to think about what _state_ actually is in plain JavaScript — and what problem any UI framework is really solving.

---

## What Is State?

State is just a variable whose value changes over time. Here is the simplest possible counter in plain JavaScript with no framework at all:

```js
let count = 0;

const button = document.querySelector('#btn');
const display = document.querySelector('#display');

button.addEventListener('click', () => {
  count++;                             // 1. mutate the variable
  display.textContent = String(count); // 2. manually update the DOM
});
```

Two things happen on every click: you **mutate** `count`, and you **manually update the DOM** to match. This works fine for one variable, but in a real app with dozens of variables and hundreds of DOM nodes, keeping them in sync by hand is where bugs live.

---

## What a Framework Does

A framework's job is to automate step 2. You write `count++` and the DOM updates itself. Different frameworks solve this differently:

- **React** re-calls the component function on every state change and diffs the output.
- **Vue / Solid** wrap variables in reactive objects or signals that track readers and schedule updates.
- **Svelte** compiles your mutations into explicit DOM update calls at build time.

Auwla takes the simplest path: **it keeps your variable as a plain JavaScript `let` in a closure, and re-runs the render function after every DOM event.**

---

## The Auwla Model

Here is the same counter in Auwla:

```tsx
import { createMemoApp } from 'auwla';

function Counter() {
  let count = 0; // a plain JavaScript variable

  return () => (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}

createMemoApp(document.getElementById('app')!, <Counter />);
```

Auwla **wraps every JSX event handler** you write in an invalidation wrapper. When `onClick` fires and `count++` runs, the wrapper schedules one re-render as a microtask. The render closure re-runs, reads the new `count`, and Auwla patches just the text node in the DOM.

That is the entire reactivity model for the common case: **mutate in an event handler, Auwla re-renders after.**

---

## Working With Objects and Arrays

Because state is just JavaScript, mutable containers work exactly as you'd expect — mutate in place, Auwla re-renders:

Keys in lists must be **stable identifiers** — not the array index. Index keys break DOM reuse when items are reordered or removed, because the index of a surviving item changes and Auwla treats it as a different node.

```tsx
function TodoList() {
  // Items are objects with a stable `id` — never use the map index as a key.
  const todos: { id: number; text: string }[] = [];
  let input = '';

  return () => (
    <div>
      <input
        value={input}
        onInput={(e) => { input = (e.target as HTMLInputElement).value; }}
      />
      <button onClick={() => {
        if (!input.trim()) return;
        todos.push({ id: Date.now(), text: input }); // stable id
        input = '';
      }}>
        Add
      </button>
      <ul>
        {todos.map((t) => <li key={t.id}>{t.text}</li>)}
      </ul>
    </div>
  );
}
```

**Derived values** work the same way — you do not need `computed()` wrappers or memoization helpers. Because the render closure re-runs fresh on every update, any expression inside it is automatically up to date:

```tsx
function Stats() {
  const scores: number[] = [];
  let total = scores.reduce((a, b) => a + b, 0);
  let average = scores.length ? total / scores.length : 0; 
  // the above derived is auto tracked by the compiler
  return () => (
      <div>
        <p>Count: {scores.length}</p>
        <p>Average: {average.toFixed(1)}</p>
      </div>
    );
}
```

The Auwla compiler also tracks variable reads in the **setup scope** to understand dependencies — so if you compute a derived value from other setup variables, the compiler knows how to wire updates without requiring you to wrap them in callbacks.

---

## Shared State Across Components

Plain closure variables are private to a single component. When you need state that multiple unrelated components share — a logged-in user, a theme, an open modal — you need a **shared module**.

There are two approaches depending on how automatic you want the updates to be.

---

### Option 1: `reactive()` cell

`reactive()` creates a cell with a `.get()` and `.set()`. Any component that calls `.get()` during its render closure is **automatically subscribed** — when `.set()` is called from anywhere, every subscribed component re-renders with no extra work.

```ts
// store/theme.ts
import { reactive } from 'auwla';

// Export the cell directly — callers call .get() in render (subscribes them)
// and .set() to update (invalidates all subscribers).
export const theme = reactive<'light' | 'dark'>('dark');
```

```tsx
function ThemeToggle() {
  return () => (
    // theme.get() inside the render closure auto-subscribes this component.
    // Calling theme.set() from anywhere triggers a re-render here.
    <button onClick={() => theme.set(theme.get() === 'dark' ? 'light' : 'dark')}>
      Current: {theme.get()}
    </button>
  );
}
```

> [!NOTE]
> The router uses `reactive()` internally for URL state — that is why `getParams()` and `getQuery()` make the components that call them automatically re-render on navigation.

---

### Option 2: Plain class singleton

If you prefer not to use `reactive()`, a plain class singleton with `commit()` inside its mutations achieves the same result. There are no cells, no subscriptions — just plain properties and an explicit re-render after mutation:

```ts
// store/theme.ts

class ThemeStore {
  // Plain TypeScript property — no reactive wrapper needed.
  theme: 'light' | 'dark' = 'dark';

  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
  }

  set(value: 'light' | 'dark') {
    this.theme = value;
  }
}

// Single instance shared across the whole app
export const themeStore = new ThemeStore();
```

```tsx
function ThemeToggle() {
  return () => (
    // themeStore.theme is just a plain property read inside the render closure.
    // When toggle() calls commit(), this component re-renders and reads the new value.
    <button onClick={() => themeStore.toggle()}>
      Current: {themeStore.theme}
    </button>
  );
}
```

---

## Summary

| Concept | Auwla's answer |
|---|---|
| What is state? | Plain `let` / `const` variables in the component closure scope |
| Event mutation → DOM update? | Automatic — every JSX handler is wrapped, re-render is scheduled after |
| Derived values | Read them directly in the render closure — no `computed()` wrappers needed |
| List keys | Must be stable identifiers from the data — never use the array index |
| Shared state (auto-subscription) | `reactive()` cell — components that read `.get()` subscribe automatically |


In the next section, **How Rendering Works** covers the two-phase model, the compiled output, what belongs in setup vs render, and how `commit()` bridges the gap for async mutations.

