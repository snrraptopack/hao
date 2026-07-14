# How Rendering Works

You now know that state in Auwla is just a plain closure variable. The next question is: **how does re-rendering actually happen?**

---

## Two Phases, One Component

An Auwla component is a function that runs once to set up its state, and returns a JSX layout. 

```tsx
// Direct JSX Return (Recommended)
function Counter() {
  // ── Setup Phase ────────────────────────────────────────────────────────
  // This block runs exactly once when the component first appears in the tree.
  let count = 0;

  // ── Render Phase ───────────────────────────────────────────────────────
  // The compiler automatically extracts this into the update loop.
  return (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}
```

Behind the scenes, the compiler automatically extracts setup state and transforms this into an optimized setup-once and update architecture. 

This direct return syntax:
* Eliminates the boilerplate of nesting render closures (`return () => JSX`).
* Controls how AI coding models reason about the component, avoiding the false assumption that setup variables aren't reactive.
* Makes components look like standard, clean, predictable TSX.

---

## Why State Doesn't Reset

In React, the entire component function re-runs on every render, so local variables reset unless you wrap them with `useState`. In Auwla, the component setup runs **once** — local variables are ordinary JavaScript variables that live in the closure scope and persist naturally:

```tsx
// count lives in the setup scope — survives every re-render
function Counter() {
  let count = 0;
  return <button onClick={() => count++}>Count: {count}</button>;
}

// count lives inside the event handler scope — resets to 0 on every call
function BrokenCounter() {
  const resetCount = () => {
    let count = 0; // ← this is re-declared on every call
    count++;
  };
  return <button onClick={resetCount}>Count: {count}</button>;
}
```

---

## What the Compiler Generates

The Vite plugin transforms your component into direct, imperative DOM operations. This removes the virtual DOM entirely — no tree diff, just targeted native calls.

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
  → update() patches the text node with the new count
```

This is why you never need to announce a state change for event-driven interactions — the wrapper takes care of it.

---

## Component Update Propagation

Auwla uses a highly optimized parent-child rendering boundary.

### Parent-to-Child: Memoized Updates
When a parent component re-renders, its child components **do not** automatically run their update logic. Auwla memoizes child components at compile time:
* A child component only updates if the props passed down by its parent have changed.
* Unaffected sibling children are guaranteed to skip their update cycles entirely, keeping DOM updates localized.

### Child-to-Parent: Upward Invalidation
When a child component updates (due to an event occurring inside it), its parent components are also updated. This allows children to propagate changes directly (for example, by mutating a shared array passed down as a prop). The parent re-renders to reflect these changes, but thanks to memoization, unaffected sibling children are guaranteed not to run when not needed.

### Shared & External State
Reactivity is not confined to the component's setup function. You can declare state variables outside components or in the same file. When components reference outside state, they naturally read the latest values during event-driven updates. We will cover advanced patterns for shared and global state in detail in a later section.
