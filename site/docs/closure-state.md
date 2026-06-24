# Closure State

Auwla is built around a simple yet powerful idea: **JavaScript closures are the ultimate state containers.** 

By leveraging native scope, Auwla avoids complex reactivity systems like Virtual DOM trees, dependency tracking graphs, or custom reactive objects (signals/observables).

---

## How It Works Under the Hood

When you declare a variable inside a component function, it resides in that function's local execution context. The returned render function forms a **closure** over these variables, retaining access to them even after the setup function has finished executing.

Here is a standard Counter component:

```tsx
function Counter() {
  let count = 0; // Local closure variable (state)

  return () => (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}
```

---

## The Compilation Output

To understand why this is so performant, look at how the Auwla compiler translates the component. It lowers the JSX declarations into direct, imperative DOM nodes and updates:

```javascript
function Counter() {
  let count = 0; // Native closure variable remains untouched

  return __componentBlock(() => {
    // 1. Initial DOM creation (runs ONCE during mount)
    const button = document.createElement('button');
    const text = document.createTextNode('');
    button.append(text);

    // 2. Attach event handler with automatic invalidation wrapper
    button.addEventListener('click', __event(() => { 
      count++; // Mutates the closure variable directly
    }));

    // Return the block description
    return {
      node: button,
      // 3. Selective DOM update (runs on re-renders)
      update() {
        __setText(text, count); // Updates only the specific text node!
      },
    };
  });
}
```

---

## Benefits of Closure-Based State

### 1. Ultra-Low Memory Overhead
There are no virtual nodes, fiber trees, or dependency tracking subscribers created in memory. State is stored as ordinary JavaScript variables, which are garbage-collected automatically when the component unmounts.

### 2. Standard JS Debugging
Because state is just normal local variables, debugging is straightforward:
- You can set standard debugger breakpoints inside your event handlers.
- You can inspect local closure variables using your browser's developer console.

### 3. Natural Encapsulation
State variables are private by default. Because they are scoped to the component's setup function, there is no way for external components to accidentally modify or read them unless they are explicitly passed down as props or event callbacks.

---

In the next section, we will look at how updates are committed to the screen using **Manual Commit**.
