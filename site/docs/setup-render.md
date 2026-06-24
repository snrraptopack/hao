# Setup vs Render

Understanding the execution lifecycle is the key to mastering Auwla. Unlike other frameworks that execute your entire component function on every state update, Auwla splits component execution into two distinct phases.

---

## The Two Phases

An Auwla component contains two parts:
1. **The Setup Scope (Outer Function)**: Runs exactly **once** when the component is instantiated.
2. **The Render Closure (Returned Inner Function)**: Runs **every time** the component re-renders.

```tsx
function ExecutionDemo() {
  // ─── 1. SETUP PHASE ───
  // Runs ONCE.
  console.log("Setup phase executed!");
  let clicks = 0;
  
  const handleCLick = () => {
    clicks++;
  };

  // ─── 2. RENDER PHASE ───
  // Runs ON every render.
  return () => {
    console.log("Render phase executed!");
    return (
      <button onClick={handleCLick}>
        Clicks: {clicks}
      </button>
    );
  };
}
```

### Console Output Sequence:
- **On Mount**:
  1. `Setup phase executed!`
  2. `Render phase executed!`
- **On Button Click**:
  1. `Render phase executed!` (Setup does not run again)

---

## Golden Rules of Setup vs Render

### 1. Declare State in the Setup Scope
Because the setup function runs only once, local variables declared here are stable and preserve their values across renders. 

> [!WARNING]
> If you declare variables *inside* the returned render closure, they will be reset back to their initial values on every single re-render.

```tsx
// ❌ WRONG: Resetting state on every render
function WrongCounter() {
  return () => {
    let count = 0; // Declared in render! Resets to 0 every time.
    return <button onClick={() => count++}>Count: {count}</button>;
  };
}

//  CORRECT: Stable state
function RightCounter() {
  let count = 0; // Declared in setup! Stays stable.
  return () => <button onClick={() => count++}>Count: {count}</button>;
}
```

### 2. Keep Side Effects Out of the Render Closure
The render closure should be pure and fast. Avoid triggering side effects (like network requests, timeouts, or DOM mutations) directly within the render body.

```tsx
// ❌ WRONG: Triggering infinite fetching loop
function BadFetch() {
  let data = null;
  return () => {
    fetch("/api/data").then(r => r.json()).then(res => {
      data = res;
      commit(); // Triggers render, which calls fetch() again, causing infinite loop!
    });
    return <div>{data}</div>;
  };
}
```

Instead, run initial side effects in the setup scope, and wrap subsequent updates in event handlers or lifecycle trackers.

---

In the next section, we'll look at **Closure State** to understand how variables map to DOM nodes behind the scenes.
