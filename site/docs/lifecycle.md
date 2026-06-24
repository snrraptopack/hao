# Component Lifecycle

An Auwla component has three moments: it **mounts** (setup runs once), it **re-renders** (the render closure runs again), and it **unmounts** (removed from the tree). Knowing what happens at each moment lets you manage timers, subscriptions, and global listeners without leaks.

---

## Mount: Setup Runs Once

The outer function body is the setup phase. It runs exactly once when the component first appears. By the time the render closure returns JSX, all your state variables, side effects, and cleanup registrations are already in place.

```tsx
import { commit, cleanup } from 'auwla';

function LiveClock() {
  let time = new Date().toLocaleTimeString();

  // setInterval runs in setup — starts once, keeps ticking
  const id = setInterval(() => {
    time = new Date().toLocaleTimeString();
    commit(); // async mutation — needs a manual commit (see State & Reactivity)
  }, 1000);

  // Register cleanup so the interval stops when the component is removed
  cleanup(() => clearInterval(id));

  return () => <p class="clock">{time}</p>;
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
import { commit, cleanup } from 'auwla';

function Poller() {
  let items: { id: number; text: string }[] = [];

  const id = setInterval(async () => {
    const res = await fetch('/api/feed');
    items = await res.json(); // each item has a stable .id from the server
    commit();
  }, 5_000);

  cleanup(() => clearInterval(id));

  return () => (
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

  return () => <div>Press Esc to close</div>;
}
```

> [!NOTE]
> `event.hotkey()` and `event.click.global` register and clean up automatically — you only need `cleanup()` for raw `addEventListener` calls and other external resources you manage yourself.

**WebSockets**

```tsx
import { commit, cleanup } from 'auwla';

function LiveFeed() {
  let messages: { id: string; text: string }[] = [];

  const socket = new WebSocket('wss://api.example.com/feed');

  socket.onmessage = (e) => {
    const msg = JSON.parse(e.data); // assume each message has a stable .id
    messages.push(msg);
    commit();
  };

  cleanup(() => socket.close());

  return () => (
    <ul>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
  );
}
```

---

## Scoped Re-renders: `component()`

`commit()` with no arguments re-renders the entire app. That is fast for most updates, but for **high-frequency sources** — a clock ticking every second, a chart updating on every data point — re-rendering the whole app repeatedly is wasteful.

`component()` returns a handle to the current component instance. Pass it to `commit(handle)` and only that component's subtree re-renders:

```tsx
import { component, commit, cleanup } from 'auwla';

function LiveClock() {
  const self = component(); // call in setup, not in the render closure

  let time = new Date().toLocaleTimeString();

  const id = setInterval(() => {
    time = new Date().toLocaleTimeString();
    commit(self); // only this component re-renders
  }, 1000);

  cleanup(() => clearInterval(id));

  return () => <p>{time}</p>;
}
```

> [!IMPORTANT]
> `component()` must be called synchronously at the top level of setup. It reads the active component context, which is only available during that synchronous setup execution.

### Choosing between `commit()` and `commit(self)`

| Source of update | Recommendation |
|---|---|
| Button click, form submit | Nothing — event handlers re-render automatically |
| Single `fetch` in setup | `commit()` — page-level update, one-off |
| `setInterval` ticking per second | `commit(self)` — limit the blast radius |
| WebSocket streaming data | `commit(self)` — avoid re-rendering unrelated UI |
| A `reactive()` store changing | Automatic — no commit needed |

---

## Lifecycle at a Glance

```
Component appears in tree
  → Setup runs (once)
      - state variables initialized
      - side effects started (fetch, timers, sockets)
      - cleanup() handlers registered

Event / commit() / reactive cell change
  → Render closure runs
      - reads current state
      - returns JSX
      - Auwla patches the DOM

Component removed from tree
  → cleanup() handlers fire (children first, then parents)
      - intervals cleared
      - sockets closed
      - listeners removed
```

---

In the **Guides** section we cover practical patterns: two-way form binding, event modifier chains, and async data loading.
