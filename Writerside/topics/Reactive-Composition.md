# Reactive Composition: Sharing State Across Components

One of Auwla's most powerful features is that **reactive primitives are pure JavaScript**. Unlike many frameworks where state is tied to specific components or contexts, Auwla's `ref`, `watch`, and `derive` can live anywhere: in component scope, module scope, or even external files. This architectural choice unlocks tremendous flexibility in how you compose and share state across your application.

> **What makes Auwla different?**
>
> In most frameworks, state is tied to component instances or requires special context providers. Auwla's reactive primitives are just plain JavaScript objects that can live anywhere and be imported like any other module. This architectural purity unlocks powerful composition patterns.
{style="note"}

## The Power of Purity: State Without Boundaries

In Auwla, reactive state doesn't belong to any particular component. A `ref` is just a reactive value that can be imported, passed around, and subscribed to from anywhere in your codebase.

<tabs>
<tab title="State Module">

```TypeScriptJSX
// state/counter.ts - State living in its own file
import { ref } from 'auwla';

export const count = ref(0);

export function increment() {
  count.value++;
}

export function decrement() {
  count.value--;
}

export function reset() {
  count.value = 0;
}
```

</tab>
<tab title="Counter Component">

```TypeScriptJSX
// components/Counter.tsx
import { h } from 'auwla';
import { count, increment, decrement, reset } from '../state/counter';

export function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

</tab>
<tab title="Display Component">

```TypeScriptJSX
// components/CountDisplay.tsx
import { h } from 'auwla';
import { count } from '../state/counter';

export function CountDisplay() {
  return <div>Current count is: {count}</div>;
}
```

</tab>
</tabs>

**What happens here?** Both `Counter` and `CountDisplay` subscribe to the same `count` ref. When you click the increment button in `Counter`, `CountDisplay` updates automatically—even though they're separate components that don't know about each other. They're simply sharing the same reactive source.

## The Subscription Model: All Subscribers Get Notified

When 10 components subscribe to the same `ref`, all 10 get notified when it changes. This is a powerful pattern, but it comes with responsibility.

```TypeScriptJSX
// Shared state
const currentUser = ref({ name: 'Alice', role: 'admin' });

// Component 1 subscribes
export function UserProfile() {
  return <div>Hello, {watch(currentUser, u => u.name)}!</div>;
}

// Component 2 subscribes
export function UserBadge() {
  return <span class="badge">{watch(currentUser, u => u.role)}</span>;
}

// Component 3 subscribes
export function AdminPanel() {
  const isAdmin = watch(currentUser, u => u.role === 'admin');
  return (
    <div>
      {watch(isAdmin, admin => 
        admin ? <button>Admin Controls</button> : null
      )}
    </div>
  );
}

// Any component can update it
function promoteUser() {
  currentUser.value = { ...currentUser.value, role: 'super-admin' };
  // All 3 components above will update!
}
```

> **Broadcast Updates**
>
> All subscribers to a `ref` are notified simultaneously when it changes. This makes state sharing effortless, but also means you should be intentional about who can mutate shared state.
{style="tip"}

This is incredibly flexible, but it also means you need to think carefully about **who can mutate shared state**.

## Read-Only vs. Mutable: The Art of Access Control

Not every component needs write access to every piece of state. In fact, most shouldn't. This is where the distinction between **direct refs** and **derived refs** becomes crucial.

### Pattern 1: Direct Ref Access (Full Mutation Rights)

When you pass a `ref` directly to a child component, you're giving it full write access:

```TypeScriptJSX
import { ref, type Ref } from 'auwla';

const temperature = ref(20);

// Child gets full access - can read AND write
function TemperatureControl(props: { temp: Ref<number> }) {
  return (
    <div>
      <p>Temperature: {props.temp}°C</p>
      <button onClick={() => props.temp.value++}>Increase</button>
      <button onClick={() => props.temp.value--}>Decrease</button>
    </div>
  );
}

// Parent passes the ref directly
export function Dashboard() {
  return <TemperatureControl temp={temperature} />;
}
```

> Use this pattern when the child component is *intended* to mutate the state, like form controls or interactive widgets.

### Pattern 2: Derived Ref Access (Read-Only)

When you pass a **derived** ref to a child, it can read and react to changes, but it **cannot mutate** the original source:

```TypeScriptJSX
import { ref, derive, watch, type Ref } from 'auwla';

const temperature = ref(20);

// Derived ref - read-only view
const displayTemp = derive(temperature, t => `${t}°C`);
const isCold = derive(temperature, t => t < 18);

// Child can only read, cannot write
function TemperatureDisplay(props: { display: Ref<string>, cold: Ref<boolean> }) {
  return (
    <div>
      <p>Current: {props.display}</p>
      {watch(props.cold, isCold => 
        isCold ? <span class="alert">It's cold!</span> : null
      )}
      {/* This won't work - derived refs are read-only */}
      {/* <button onClick={() => props.display.value = '25°C'}>Won't work!</button> */}
    </div>
  );
}

export function Dashboard() {
  return <TemperatureDisplay display={displayTemp} cold={isCold} />;
}
```

> Use this pattern when the child only needs to *display* or *react to* the data, not change it.

### Pattern 3: Exposing Functions (Controlled Mutations)

The most maintainable pattern for shared state: expose **functions** that encapsulate how state can be changed:

<tabs>
<tab title="State Module">

```TypeScriptJSX
// state/theme.ts - State module with controlled API
import { ref, derive } from 'auwla';

type Theme = 'light' | 'dark' | 'auto';

const theme = ref<Theme>('light');

// Public read-only access
export const currentTheme = derive(theme, t => t);

// Public mutation functions
export function setTheme(newTheme: Theme) {
  if (['light', 'dark', 'auto'].includes(newTheme)) {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
  }
}

export function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
}
```

</tab>
<tab title="Component">

```TypeScriptJSX
// components/ThemeToggle.tsx
import { h } from 'auwla';
import { currentTheme, toggleTheme } from '../state/theme';

export function ThemeToggle() {
  return (
    <button onClick={toggleTheme}>
      Current: {currentTheme} (Click to toggle)
    </button>
  );
}
```

</tab>
</tabs>

> **Best Practice: Function-Based API**
>
> **Why this is best**:
> - State mutation logic is centralized
> - Validation and side effects (like localStorage) are handled in one place
> - Components can't accidentally break state invariants
> - Easy to test and debug
{style="tip"}

## Component Props: Passing Reactive Values

You can pass reactive values as props just like any other value. The child component can then subscribe to them:

```TypeScriptJSX
import { ref, watch, type Ref } from 'auwla';

const globalCount = ref(0);

// Child receives a ref and subscribes to it
function CounterDisplay(props: { counter: Ref<number> }) {
  // Can use the ref directly in JSX
  return <div>Count: {props.counter}</div>;
  
  // Or derive from it
  const doubled = watch(props.counter, c => c * 2);
  return <div>Doubled: {doubled}</div>;
}

// Parent passes the ref as a prop
export function App() {
  return (
    <div>
      <CounterDisplay counter={globalCount} />
      <button onClick={() => globalCount.value++}>Increment</button>
    </div>
  );
}
```

> When a component receives a `Ref` as a prop, it's receiving a **reference** to reactive state. Changes made by anyone will be visible to everyone subscribed.
{style="note"}

## External State Modules: The Recommended Pattern

For larger applications, the most maintainable pattern is to define state in separate modules:

<tabs>
<tab title="State Module">

```TypeScriptJSX
// state/cart.ts
import { ref, derive } from 'auwla';

type CartItem = { id: number; name: string; quantity: number; price: number };

const items = ref<CartItem[]>([]);

// Public read-only views
export const cartItems = derive(items, i => i);
export const itemCount = derive(items, i => i.reduce((sum, item) => sum + item.quantity, 0));
export const totalPrice = derive(items, i => i.reduce((sum, item) => sum + (item.price * item.quantity), 0));

// Public mutation functions
export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const existing = items.value.find(i => i.id === item.id);
  if (existing) {
    items.value = items.value.map(i => 
      i.id === item.id 
        ? { ...i, quantity: i.quantity + 1 }
        : i
    );
  } else {
    items.value = [...items.value, { ...item, quantity: 1 }];
  }
}

export function removeFromCart(id: number) {
  items.value = items.value.filter(i => i.id !== id);
}

export function updateQuantity(id: number, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  items.value = items.value.map(i => 
    i.id === id ? { ...i, quantity } : i
  );
}

export function clearCart() {
  items.value = [];
}
```

</tab>
<tab title="Component">

```TypeScriptJSX
// components/Cart.tsx
import { h } from 'auwla';
import { cartItems, totalPrice, removeFromCart } from '../state/cart';

export function Cart() {
  return (
    <div>
      <h2>Shopping Cart</h2>
      <p>Total: ${totalPrice}</p>
      <ul>
        {watch(cartItems, items => 
          items.map(item => (
            <li key={item.id}>
              {item.name} x {item.quantity} - ${item.price * item.quantity}
              <button onClick={() => removeFromCart(item.id)}>Remove</button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
```

</tab>
</tabs>

**Benefits**:
- State and logic live together in one place
- Multiple components can import and use the same state
- No prop drilling needed
- Clear API boundary between state and UI
- Easy to test state logic independently

## Using `createStore` for Shared State

For complex nested state, `createStore` works beautifully as a shared state container:

<tabs>
<tab title="Store Definition">

```TypeScriptJSX
// state/app.ts
import { createStore } from 'auwla';

type AppState = {
  user: { name: string; email: string } | null;
  notifications: Array<{ id: number; message: string; read: boolean }>;
  settings: { theme: 'light' | 'dark'; language: string };
};

export const appStore = createStore<AppState>({
  user: null,
  notifications: [],
  settings: { theme: 'light', language: 'en' }
});

// Branches for focused access
export const userBranch = appStore.branch(
  s => s.user,
  (s, user) => ({ ...s, user })
);

export const notificationsBranch = appStore.branch(
  s => s.notifications,
  (s, notifications) => ({ ...s, notifications })
);

// Helper functions
export function login(name: string, email: string) {
  appStore.patch({ user: { name, email } });
}

export function logout() {
  appStore.patch({ user: null });
}

export function addNotification(message: string) {
  appStore.updateAtKey('notifications', notifications => [
    ...notifications,
    { id: Date.now(), message, read: false }
  ]);
}
```

</tab>
<tab title="Component Usage">

```TypeScriptJSX
import { h, watch } from 'auwla';
import { userBranch, logout } from '../state/app';

export function UserMenu() {
  const user = userBranch.value;
  
  return watch(user, u => 
    u ? (
      <div>
        <span>Welcome, {u.name}!</span>
        <button onClick={logout}>Logout</button>
      </div>
    ) : (
      <a href="/login">Login</a>
    )
  );
}
```

</tab>
</tabs>

## The Critical Constraint: Automatic Cleanup Only in Components

Here's the most important thing to understand about Auwla's reactivity: **Automatic cleanup only happens inside component scope**.

> **Memory Management is Your Responsibility Outside Components**
>
> Auwla automatically cleans up watchers created inside components when they unmount. Outside components, **you must manually call the cleanup function** to prevent memory leaks.
{style="warning"}

### Inside Components: Cleanup is Automatic

When you use `watch`, `watchEffect`, or `derive` inside a component, Auwla tracks these subscriptions and automatically cleans them up when the component unmounts:

```TypeScriptJSX
import { h, ref, watch, Component } from 'auwla';

const globalCount = ref(0);

export const Counter = Component(() => {
  //  This watcher is automatically cleaned up on unmount
  watch(globalCount, (count) => {
    console.log('Count changed:', count);
  });
  
  //  This derived ref is automatically cleaned up on unmount
  const doubled = watch(globalCount, c => c * 2);
  
  return (
    <div>
      <p>Count: {globalCount}</p>
      <p>Doubled: {doubled}</p>
    </div>
  );
});
```

### Outside Components: Manual Cleanup Required ⚠️

When you create watchers **outside** of component scope (at module level or in utility functions), you must manually clean them up.

> **Critical: Don't Return Values from Watchers Outside Components**
>
> To get the cleanup function, your watcher callback **must not return a value**. If it returns a value, `watch` creates a derived ref instead of returning a cleanup function. Use `watchEffect` for side effects outside components—it always returns a cleanup function.
{style="warning"}

<tabs>
<tab title="❌ Wrong - Memory Leak">

```TypeScriptJSX
import { ref, watch } from 'auwla';

const count = ref(0);

// ❌ Memory leak! This watcher is never cleaned up
watch(count, (value) => {
  console.log('Count:', value);
});
```

</tab>
<tab title=" Correct - Using watch">

```TypeScriptJSX
import { ref, watch } from 'auwla';

const count = ref(0);

//  Proper cleanup: callback returns NO value to get cleanup function
const cleanup = watch(count, (value) => {
  console.log('Count:', value);
  // Don't return anything!
});

// Later, when you're done...
cleanup(); // Unsubscribe and free memory
```

</tab>
<tab title=" Correct - Using watchEffect">

```TypeScriptJSX
import { ref, watchEffect } from 'auwla';

const count = ref(0);

//  watchEffect always returns a cleanup function
const cleanup = watchEffect(count, (value) => {
  console.log('Count:', value);
});

// Later, when you're done...
cleanup(); // Unsubscribe and free memory
```

</tab>
<tab title="❌ Wrong - Returns Value">

```TypeScriptJSX
import { ref, watch } from 'auwla';

const count = ref(0);

// ❌ This returns a Ref, not a cleanup function!
const doubled = watch(count, (value) => {
  console.log('Count:', value);
  return value * 2; // ❌ Returning a value creates a derived ref
});

// doubled is a Ref<number>, not a cleanup function!
// The subscription can't be cleaned up properly
```

</tab>
</tabs>

### Why This Matters

If you create watchers at module scope and never clean them up, they'll keep running forever—even if the components that needed them are long gone. This leads to:
- **Memory leaks**: Subscriptions accumulate over time
- **Performance issues**: Dead watchers still execute on every change
- **Bugs**: Side effects running when they shouldn't

### Best Practice: Watchers in Components, Not Modules

The safest pattern is to create watchers **inside components** where cleanup is automatic:

<tabs>
<tab title=" Recommended Pattern">

```TypeScriptJSX
//  Good: State in module, watchers in components
// state/counter.ts
import { ref } from 'auwla';

export const count = ref(0);
export function increment() { count.value++; }
```

```TypeScriptJSX
// components/Counter.tsx
import { h, watch, Component } from 'auwla';
import { count, increment } from '../state/counter';

export const Counter = Component(() => {
  // Watcher here - automatically cleaned up
  watch(count, (val) => {
    console.log('Count changed:', val);
  });
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+</button>
    </div>
  );
});
```

</tab>
</tabs>

### When You Must Watch Outside Components

If you absolutely need a watcher at module scope (for example, syncing to localStorage), explicitly manage its lifecycle:

<tabs>
<tab title="Using watch">

```TypeScriptJSX
// state/theme.ts
import { ref, watch } from 'auwla';

const theme = ref<'light' | 'dark'>('light');

// Module-level watcher with explicit cleanup
// Important: Don't return a value to get the cleanup function
const cleanupWatcher = watch(theme, (value) => {
  localStorage.setItem('theme', value);
  document.body.classList.toggle('dark-mode', value === 'dark');
  // No return statement - this gives us a cleanup function
});

// Export cleanup for app teardown (if needed)
export function cleanupThemeSync() {
  cleanupWatcher();
}

export { theme };
```

</tab>
<tab title="Using watchEffect">

```TypeScriptJSX
// state/theme.ts
import { ref, watchEffect } from 'auwla';

const theme = ref<'light' | 'dark'>('light');

// watchEffect always returns a cleanup function
const cleanupWatcher = watchEffect(theme, (value) => {
  localStorage.setItem('theme', value);
  document.body.classList.toggle('dark-mode', value === 'dark');
});

// Export cleanup for app teardown (if needed)
export function cleanupThemeSync() {
  cleanupWatcher();
}

export { theme };
```

</tab>
</tabs>

> **Choosing Between watch and watchEffect**
>
> - Use **`watchEffect`** for side effects outside components—it's explicit about always returning a cleanup function
> - Use **`watch`** when you need a computed value (return something) or want explicit control over dependencies
> - Remember: `watch` only returns a cleanup function when the callback doesn't return a value!
{style="tip"}

## Summary: Flexibility with Responsibility

Auwla's pure reactive primitives give you incredible flexibility:

 **State can live anywhere**: components, modules, external files  
 **Multiple subscribers**: 10 components can watch the same ref  
 **Free mutation**: Anyone with a ref can change it  
 **Derived refs**: Create read-only views of mutable state  
 **Composable**: Pass refs as props, import from modules, derive new refs  

But with this flexibility comes responsibility:

 **Distinguish read vs. write**: Use `derive` to create read-only views  
 **Expose functions, not raw refs**: Encapsulate mutation logic  
 **Watch placement matters**: Create watchers inside components for automatic cleanup  
 **Manual cleanup outside**: Store and call cleanup functions for module-level watchers  
 **No return values for cleanup**: Watchers outside components must not return values to get cleanup functions

Follow these patterns, and you'll build maintainable, performant applications that leverage Auwla's reactive composition to its fullest potential.
