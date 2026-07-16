=<Header>
title: Component Lifecycle
=</Header>

# Component Lifecycle

An Auwla component has three moments: it **mounts** (setup runs once), it **re-renders** (the render closure runs again), and it **unmounts** (removed from the tree). Knowing what happens at each moment lets you manage timers, subscriptions, and global listeners without leaks.

---

## Mount: Setup Runs Once

The outer function body is the setup phase. It runs exactly once when the component first appears. By the time the render closure returns JSX, all your state variables, side effects, and cleanup registrations are already in place.

```tsx
import { cleanup } from 'auwla';

function LiveClock() {
  let time = new Date().toLocaleTimeString();

  // Starts once, ticks automatically
  const id = setInterval(() => {
    time = new Date().toLocaleTimeString();
  }, 1000);

  // Stop the interval when the component is removed
  cleanup(() => clearInterval(id));

  return <p class="clock">{time}</p>;
}
```

---

## Unmount: `cleanup()`

`cleanup()` registers a function that Auwla calls when the component is removed from the tree — either because a conditional hid it, or the user navigated away. Without it, intervals keep ticking, sockets stay open, and listeners pile up.

```tsx
import { cleanup } from 'auwla';

// cleanup() can be called multiple times — each registration is independent.
// Cleanups fire children-before-parents.
cleanup(() => clearInterval(id));
cleanup(() => socket.close());
cleanup(() => document.removeEventListener('keydown', handler));
```

> [!IMPORTANT]
> Call `cleanup()` synchronously in the setup scope. Calling it inside the render closure or an event handler will throw an error.

### Common patterns

**Timers**

```tsx
import { cleanup } from 'auwla';

function Poller() {
  let items: { id: number; text: string }[] = [];

  const id = setInterval(async () => {
    const res = await fetch('/api/feed');
    items = await res.json();
  }, 5_000);

  cleanup(() => clearInterval(id));

  return (
    <ul>{items.map((item) => <li key={item.id}>{item.text}</li>)}</ul>
  );
}
```

**Raw event listeners**

```tsx
import { cleanup } from 'auwla';

function EscapeHandler() {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };

  document.addEventListener('keydown', handler);
  cleanup(() => document.removeEventListener('keydown', handler));

  return <div>Press Esc to close</div>;
}
```

> [!NOTE]
> `event.hotkey()` and `event.click.global` register and clean up automatically — you only need `cleanup()` for raw `addEventListener` calls and other external resources you manage yourself.

**WebSockets**

```tsx
import { cleanup } from 'auwla';

function LiveFeed() {
  const socket = new WebSocket('wss://api.example.com/feed');

  // Register cleanup so the socket closes when the component is removed
  cleanup(() => socket.close());

  return <div>Feed Active</div>;
}
```

---

## Custom Helpers and Hooks (Cleanup Outside of Components)

Because `cleanup()` registers its callback on the currently executing component setup context, it is not limited to the component body itself. You can call `cleanup()` inside custom helper functions or utility hooks declared outside your component, as long as they are called synchronously during the component's setup phase:

```tsx
import { cleanup } from 'auwla';

// A custom utility helper defined outside the component
function useDocumentTitle(title: string) {
  const originalTitle = document.title;
  document.title = title;

  // Automatically registers cleanup on the calling component instance
  cleanup(() => {
    document.title = originalTitle;
  });
}

// Usage inside components
function DetailPage() {
  useDocumentTitle("Product Details");
  return <h1>Product details...</h1>;
}
```

This makes it extremely easy to encapsulate setup-and-cleanup logic in reusable hooks without having to pass cleanup callbacks back and forth.

---

## Lifecycle at a Glance

```
Component appears in tree
  → Setup runs (once)
      - state variables initialized
      - side effects started (fetch, timers, sockets)
      - cleanup() handlers registered

Event / state change
  → Render closure / template runs
      - reads current state
      - returns JSX / patches the DOM

Component removed from tree
  → cleanup() handlers fire (children first, then parents)
      - intervals cleared
      - sockets closed
      - listeners removed
```

---

In the next section, we will cover the [Compiler](/docs/compiler) and how it optimizes your JSX into direct DOM operations.

