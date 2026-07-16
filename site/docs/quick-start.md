=<Header>
title: Quick Start
=</Header>

# Quick Start

Let's build a simple interactive component with Auwla to see how components, local state, and event-driven updates work in practice.

## Your First Component

In Auwla, a component is just a standard JavaScript/TypeScript function. It runs exactly once to initialize local variables (state) and returns a **render function** (closure) that defines the JSX structure:

```tsx
// App.tsx
import { createMemoApp } from "auwla";

function App() {
  // 1. Setup State: Plain local variables are your component state
  let text = "";
  let items: string[] = [];

  function addItem() {
    const trimmed = text.trim();
    if (!trimmed) return;
    items.push(trimmed);
    text = ""; // Reset the state
  }

  // 2. Render Closure: Returns the JSX and is evaluated on re-renders
  return (
    <div style={{ padding: "20px" }}>
      <h1>Auwla Task List</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          bind={text}
          placeholder="New task..."
        />
        <button onClick={addItem}>Add Task</button>
      </div>

      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Mount the app
createMemoApp(document.getElementById("app")!, <App />);
```

## Key Reactivity Takeaways

1. **Zero Reactive Wrappers**: You don't need `useState()`, `ref()`, or signals. Plain local variables hold your state.
2. **Setup Runs Once**: The outer function (`App`) only executes once, while the returned inner function executes whenever state changes.
3. **Automatic Updates**: Mutating state inside any event handler automatically schedules a DOM update.

---

In the next section, we will delve deeper into [Core Reactivity](/docs/state-reactivity) to see the differences between the Setup and Render phases.
