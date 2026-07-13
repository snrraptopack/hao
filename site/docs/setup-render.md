# How Rendering Works

You now know that state in Auwla is just a plain closure variable. The next question is: **how does re-rendering actually happen?**

---

## Two Phases, One Component

An Auwla component is a function that runs once. That single run is the **setup phase** — it initializes state, starts any async work, and returns a **render closure**: a `() => JSX` function that Auwla holds onto.

```tsx
function Counter() {
  // ── Setup ──────────────────────────────────────────────────────────────
  // This block runs exactly once when the component first appears in the tree.
  let count = 0;

  // ── Render closure ─────────────────────────────────────────────────────
  // This function is what Auwla calls every time it needs to update the DOM.
  return () => (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}
```

The render closure is a real JavaScript closure — it still has access to `count` after the setup function has returned. Every time Auwla calls it, it reads the current value of `count` and returns fresh JSX describing what the DOM should look like.

---

## Direct JSX Returns (Syntax Sugar)

While returning a render closure (`return () => JSX`) is the explicit way to define setup and render boundaries, Auwla supports returning the JSX directly:

```tsx
// Direct JSX Return (Recommended)
function Counter() {
  let count = 0;
  return (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}
```

Behind the scenes, the compiler automatically extracts setup state and transforms this into the exact same optimized setup-once and render-closure architecture.

This syntax sugar:
* Eliminates the boilerplate of nested return functions.
* Controls how AI coding models reason about the component, avoiding the false assumption that setup variables aren't reactive.
* Makes components look like standard, clean, predictable TSX.

---

## Why State Doesn't Reset

In React the entire component function re-runs on every render, so local variables reset unless you wrap them with `useState`. In Auwla the setup function runs **once** — local variables are ordinary JavaScript variables that live in the closure scope and persist naturally:

```tsx
// count lives in the setup scope — survives every re-render
function Counter() {
  let count = 0;
  return () => <button onClick={() => count++}>Count: {count}</button>;
}

// count lives inside the render closure — resets to 0 on every render
function BrokenCounter() {
  return () => {
    let count = 0; // ← this is re-declared on every call
    return <button onClick={() => count++}>Count: {count}</button>;
  };
}
```

The broken version will always display `0` — every time the closure runs, `count` starts fresh.

---

## What the Compiler Generates

The Vite plugin transforms your render closure into direct, imperative DOM operations. This removes the virtual DOM entirely — no tree diff, just targeted native calls.

Here is the compiled output for the counter:

```js
function Counter() {
  let count = 0; // the variable is untouched — still a plain number

  return __componentBlock(() => {
    // ── Runs once on mount ──────────────────────────────────────
    const button = document.createElement('button');
    const text = document.createTextNode('');
    button.append(text);

    // The click handler is wrapped — after it runs, a re-render is queued.
    button.addEventListener('click', __event(() => {
      count++; // mutates the closure variable directly
    }));

    return {
      node: button,

      // ── Runs on every re-render ─────────────────────────────────
      update() {
        __setText(text, count); // only this text node is touched
      },
    };
  });
}
```

The DOM node is created once. From that point on, only the `update()` function runs — it patches exactly the pieces that can change. This is why Auwla is fast without a virtual DOM.

---

## How Event Handlers Schedule Re-renders

Looking at the compiled output, every JSX event handler you write is passed through `__event()`. This wrapper does two things: runs your handler, then queues one re-render as a microtask.

```
Click fires
  → __event wrapper executes your onClick handler
  → count++ mutates the closure variable
  → wrapper schedules a re-render (microtask, batched)
  → render closure runs
  → update() patches the text node with the new count
```

This is why you never need to announce a state change for event-driven interactions — the wrapper takes care of it.

---

## Component Update Propagation

Auwla uses a highly optimized parent-child rendering boundary.

### Parent-to-Child: Memoized Updates
When a parent component re-renders, its child components **do not** automatically run their render closures. Auwla memoizes child components at compile time:
* A child component only re-renders if the props passed down by its parent have changed.
* Unaffected sibling children are guaranteed to skip their update cycles entirely, keeping DOM updates localized.

### Child-to-Parent: Upward Invalidation
When a child component re-renders (due to an event occurring inside it), its parent components are also re-rendered. This allows children to propagate changes directly (for example, by mutating a shared array passed down as a prop). The parent re-renders to reflect these changes, but thanks to memoization, unaffected sibling children are guaranteed not to run when not needed.

### Shared & External State
Reactivity is not confined to the component's setup function. You can declare state variables outside components or in the same file. When components reference outside state, they naturally read the latest values during event-driven re-renders. We will cover advanced patterns for shared and global state in detail in a later section.

---

In the next section, [Component Lifecycle](/docs/lifecycle) covers what happens when a component unmounts, how to clean up timers and listeners, and how to scope re-renders to a single component with `component()`.
