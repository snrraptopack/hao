=<Header>
title: Shared & Global State
=</Header>

# Shared & Global State

Sharing state across components is a common architectural pattern. However, because Auwla's reactivity system relies on compiler-driven tracking of local variables, you cannot share state by simply importing a raw variable from another file.

---

## The Plain Variable Import Pitfall

If you declare a mutable variable inside an external JavaScript/TypeScript file and import it directly into your component templates:

```typescript
// ❌ WRONG: Auwla will not detect mutations to plain imported variables!
// src/stores/theme.ts
export let sharedTheme = 'light';

export function toggleTheme() {
  sharedTheme = sharedTheme === 'light' ? 'dark' : 'light';
}
```

Because the compiler only scans and processes component TSX files, it cannot trace or wrap changes occurring inside plain external modules. Mutating `sharedTheme` directly will cause component displays to become stale and fail to re-render.

To solve this and share state reliably, Auwla supports two distinct patterns:

---

## Approach 1: The Shared Class Store (Zero API approach)

You can share state using standard JavaScript classes. Wrap your state inside properties, declare getters and setters, and export a single instance of the class. 

**This approach requires no observables, no signals, no state wrappers, and no imports from Auwla:**

```typescript
// src/stores/theme.ts
class ThemeStore {
  private _theme = 'light';

  get theme() {
    return this._theme;
  }

  toggle() {
    this._theme = this._theme === 'light' ? 'dark' : 'light';
  }
}

// Export a single instance to share across the application
export const themeStore = new ThemeStore();
```

Inside your components, simply import and read/write properties on the shared instance:

```tsx
// src/components/ThemeSwitcher.tsx
import { themeStore } from '../stores/theme';

export default function ThemeSwitcher() {
  return (
    <button onClick={() => themeStore.toggle()}>
      Theme is: {themeStore.theme}
    </button>
  );
}
```

### Why it works:
Because Auwla compiles JSX event handlers with automatic invalidation boundaries, when the user clicks the button and mutates the class store via `themeStore.toggle()`, the component automatically re-renders to reflect the new getter value. There is no state management library boilerplate required!

---

## Approach 2: The `reactive` Helper (Granular Subscriptions)

Auwla exports a `reactive` cell helper. While originally created for internal router path coordination, it is fully exposed for developers who require granular state tracking.

A reactive cell manages subscriptions automatically based on who reads it:

```typescript
// src/stores/theme.ts
import { reactive } from 'auwla';

// 1. Initialize the reactive cell
export const themeCell = reactive('light');

export function toggleTheme() {
  const next = themeCell.get() === 'light' ? 'dark' : 'light';
  // 2. Set the new value, notifying only subscribed components
  themeCell.set(next);
}
```

To consume the state, import the cell and call `.get()` inside your component template:

```tsx
// src/components/Display.tsx
import { themeCell, toggleTheme } from '../stores/theme';

export default function Display() {
  // Calling themeCell.get() registers this component as a subscriber.
  // When themeCell.set() is called, ONLY components calling get() re-render.
  return (
    <div>
      <p>Theme value: {themeCell.get()}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Why use this?
*   **Targeted re-renders**: Updates are scoped exclusively to the specific components that currently read the reactive cell.
*   **Implicit subscriptions**: Subscriptions are handled transparently at render-time, requiring no manual event hooks or cleanup.
