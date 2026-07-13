# What the Compiler Can't See

Auwla is designed so that standard asynchronous mutations "just work" without wrappers or manual setup. However, because Auwla's reactivity relies on static compile-time analysis, there are boundaries where the compiler cannot trace changes.

Knowing what happens behind the scenes allows you to use Auwla's manual escape hatches when working with third-party libraries, WebSockets, or untrackable references.

---

## Normal State Operations (Auto-Scheduling)

When you write asynchronous updates using built-in macros like `setTimeout`, `setInterval`, `fetch`, or `async/await`, Auwla automatically schedules a component re-render when the state mutates.

For example, this timer updates the screen every second:

```tsx
function Ticker() {
  let time = new Date().toLocaleTimeString();

  setInterval(() => {
    time = new Date().toLocaleTimeString();
  }, 1000);

  return <p>{time}</p>;
}
```

The compiler detects that `time` is mutated inside the `setInterval` callback and automatically schedules the re-render. You do not need to import any reactive primitives or trigger functions.

---

## What the Compiler Actually Does

To understand why the compiler can automate this, and how to write custom triggers when it cannot, let's look at the underlying primitives: `component()` and `commit()`.

### `component()`
Every Auwla component can access a reference to its host instance using `component()`. This reference (commonly named `self`) serves as a unique key for scoping re-renders:

```ts
import { component } from 'auwla';
const self = component();
```

### `commit(self)`
The `commit()` function is the manual invalidation signal. When you pass `self` (the component handle), Auwla schedules a microtask-aligned re-render for **only** that specific component and its dirty descendants:

```ts
import { commit } from 'auwla';
commit(self);
```

### Batching
Multiple calls to `commit(self)` within the same microtask are automatically batched. If you mutate five variables and call `commit(self)` five times in the same synchronous block, Auwla will perform exactly one DOM update pass at the end of the tick.

---

### The Compiler's Transformation

When the compiler parses the `Ticker` example, it automatically injects a `component()` handle and wraps your asynchronous callbacks in a `try/finally` block that invokes `commit(self)` at the end of the work:

```ts
// What the compiler actually generates:
function Ticker() {
  const self = __component(); // Setup component reference
  let time = new Date().toLocaleTimeString();

  setInterval(() => {
    try {
      time = new Date().toLocaleTimeString(); // Mutates state
    } finally {
      __commit(self); // Triggers re-render for this component
    }
  }, 1000);

  // ...
}
```

---

## Third-Party Libraries & Limitations

The compiler's auto-scheduling relies on the ability to statically trace a mutation back to the variables declared in the component setup scope. Two scenarios fall outside what the compiler can automatically trace:

### 1. Unrecognized Callbacks
If you register a callback inside a third-party library or custom SDK (like a WebSocket, a native state stream, or an RxJS observer), the compiler cannot identify that the callback contains mutations that affect the component.

### 2. Untraceable Aliases
If you mutate variables through aliases or remote module caches (such as changing a property on a global object import without reassigning the variable name), the compiler cannot prove a mutation occurred on a setup-scoped variable.

---

## The Manual Escape Hatch: `commit(self)`

For cases the compiler cannot see, you can manually import `component` and `commit` to trigger re-renders. 

Here is how you handle a WebSocket message listener from a third-party library:

```tsx
import { component, commit } from 'auwla';
import { socket } from './socket';

function LiveFeed() {
  const self = component(); // Grab the host component handle
  let messages: string[] = [];

  socket.on('message', (msg) => {
    messages.push(msg); // Mutate array in-place
    
    // Explicitly notify Auwla that this component needs to re-render
    commit(self); 
  });

  return (
    <ul>
      {messages.map((m, index) => (
        <li key={index}>{m}</li>
      ))}
    </ul>
  );
}
```

---

## Global Invalidation: `commit()`

If you call `commit()` with **no arguments**, it signals a global invalidation, scheduling a re-render for all mounted components on the page:

```ts
import { commit } from 'auwla';

function logoutUser() {
  clearAuthSession();
  commit(); // Re-renders every component to reflect the logged-out state
}
```

You will rarely need the global `commit()` in regular component development, but it is extremely useful for high-level event bus handlers or global state libraries.
