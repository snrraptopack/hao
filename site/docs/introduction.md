# Introduction to Auwla

Auwla is a tiny, typed DOM runtime for JSX apps with event-driven rerendering and DOM reuse.

It is designed to give you the performance of direct, compiled DOM operations with the clean developer experience of TSX and raw JavaScript closure state.

## Core Philosophies

1. **No Hooks, Refs, or Signals**: You don't need complex reactive primitives. Component state is just plain JavaScript variables declared in your setup function.
2. **Setup-Once Execution**: Components run exactly once to initialize state. Event handlers update variables directly, scheduling a single microtask-aligned re-render.
3. **Memoized DOM Reuse**: Instead of rebuilding the DOM tree or maintaining a virtual DOM, Auwla patches changes directly and reuses elements with stable keys.
4. **Isomorphic & SSR Ready**: With built-in server-side rendering and client-side hydration, your app is SEO-friendly and fast from the start.

## Quick Start Example

Here is what a typical counter component looks like:

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

In the next section, we will walk through the installation process and configure your first project.
