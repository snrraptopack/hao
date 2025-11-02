# Structured State with `createStore`

In the previous guide, we explored Auwla's selective rendering model using a Todo list. We saw two valid approaches: embedding `ref`s in your data or using immutable updates with plain objects. Both work, but as your application grows and state becomes more complex and nested, managing immutable updates manually can become verbose and error-prone.

This is where `createStore` comes in. It's a local, structured state container that makes managing complex, nested state ergonomic while maintaining the same immutable update principles and selective rendering model you've already learned.

## Starting Simple: A Counter with Plain `ref`

Let's start with something trivial—a counter with a label. With plain `ref`, this is straightforward:

```TypeScriptJSX
import { h, ref } from 'auwla';

const count = ref(0);
const label = ref('Clicks');

function increment() {
  count.value++;
}

function setLabel(newLabel: string) {
  label.value = newLabel;
}

export function SimpleCounter() {
  return (
    <div>
      <p>{label}: {count}</p>
      <button onClick={increment}>Increment</button>
      <input onInput={(e) => setLabel((e.target as HTMLInputElement).value)} />
    </div>
  );
}
```

This works perfectly. Two separate `ref`s, simple updates. No problems here.

## Introducing Complexity: Nested User Profile

Now let's make it more realistic. Imagine you're building a user profile editor with nested data:

```TypeScriptJSX
type User = {
  profile: {
    name: string;
    email: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  stats: {
    posts: number;
    followers: number;
  };
};
```

With plain `ref`, updating a deeply nested field like `theme` requires this:

```TypeScriptJSX
import { h, ref } from 'auwla';

const user = ref<User>({
  profile: { name: 'Alice', email: 'alice@example.com' },
  settings: { theme: 'light', notifications: true },
  stats: { posts: 42, followers: 128 },
});

function toggleTheme() {
  const current = user.value;
  // You must manually rebuild the entire path
  user.value = {
    ...current,
    settings: {
      ...current.settings,
      theme: current.settings.theme === 'light' ? 'dark' : 'light',
    },
  };
}
```

See how verbose that is? You have to spread every level of the tree from the root down to the field you're changing. It's correct, but tedious. As your state structure grows, this becomes unmaintainable.

## Enter `createStore`: Ergonomic Immutable Updates

`createStore` solves this by providing a structured container with helper methods that handle immutable updates for you. Under the hood, it's still using a `ref` and creating new objects, but you get a much cleaner API.

Here's the same example using `createStore`:

```TypeScriptJSX
import { h, createStore } from 'auwla';

const userStore = createStore<User>({
  profile: { name: 'Alice', email: 'alice@example.com' },
  settings: { theme: 'light', notifications: true },
  stats: { posts: 42, followers: 128 },
});

function toggleTheme() {
  userStore.updateAtKey('settings', (settings) => ({
    ...settings,
    theme: settings.theme === 'light' ? 'dark' : 'light',
  }));
}
```

Much better! Let's break down what `createStore` gives you.

## Core Operations

### 1. `set()` - Replace the Entire State

The simplest operation. Replace the entire root state with a new value.

```TypeScriptJSX
userStore.set({
  profile: { name: 'Bob', email: 'bob@example.com' },
  settings: { theme: 'dark', notifications: false },
  stats: { posts: 0, followers: 0 },
});
```

Use this when you're loading fresh data or resetting state.

### 2. `update()` - Compute New State from Previous

When you need to compute the next state based on the current state, use `update()`.

```TypeScriptJSX
// Increment the post count
userStore.update((prev) => ({
  ...prev,
  stats: {
    ...prev.stats,
    posts: prev.stats.posts + 1,
  },
}));
```

This is the most general-purpose method. You receive the previous state and return the new state.

### 3. `patch()` - Shallow Merge Top-Level Keys

For object-based state, `patch()` lets you update only the top-level keys you care about. The rest remain unchanged.

```TypeScriptJSX
// Only update the profile, leave settings and stats untouched
userStore.patch({
  profile: { name: 'Charlie', email: 'charlie@example.com' },
});
```

This is cleaner than `update()` when you're only changing one or two top-level fields.

### 4. `updateAtKey()` - Update a Single Top-Level Key with a Function

Like `patch()`, but you provide a mutator function for a specific key. This is perfect when the new value depends on the old value.

```TypeScriptJSX
// Toggle notifications
userStore.updateAtKey('settings', (settings) => ({
  ...settings,
  notifications: !settings.notifications,
}));

// Increment followers
userStore.updateAtKey('stats', (stats) => ({
  ...stats,
  followers: stats.followers + 1,
}));
```

You only need to spread and rebuild the slice you're changing, not the entire root.

## Advanced: Working with Nested State via `branch()`

The real power of `createStore` comes from `branch()`. A branch creates a **focused view** on a nested slice of your state. It gives you a `SubStore` with its own reactive `value` and write helpers.

### Creating a Branch

A branch needs two functions:
1. **`get`**: How to extract the slice from the root state.
2. **`put`**: How to write the slice back into a new root state.

```TypeScriptJSX
// Create a branch focused on the settings object
const settingsBranch = userStore.branch(
  (root) => root.settings,  // get
  (root, newSettings) => ({ ...root, settings: newSettings })  // put
);

// Now you can work directly with the settings slice
settingsBranch.update((settings) => ({
  ...settings,
  theme: 'dark',
}));

// Or use the updateAt helper on the branch
settingsBranch.updateAt('theme', 'light');
```

The beauty of `branch()` is that it returns a `Ref<U>` for the slice. You can use this directly in your JSX for selective rendering:

```TypeScriptJSX
export function SettingsPanel() {
  const settingsBranch = userStore.branch(
    (root) => root.settings,
    (root, newSettings) => ({ ...root, settings: newSettings })
  );

  return (
    <div>
      <p>Theme: {settingsBranch.value.value.theme}</p>
      <button onClick={() => settingsBranch.updateAt('theme', 'dark')}>
        Dark Mode
      </button>
    </div>
  );
}
```

### Read-Only Branches

If you only need to read a slice (not write to it), you can omit the `put` function:

```TypeScriptJSX
// Read-only view of stats
const statsBranch = userStore.branch((root) => root.stats);

// You can use this in JSX
<p>Posts: {statsBranch.value.value.posts}</p>
```

Any attempt to call `.set()` or `.update()` on a read-only branch will throw an error.

## One-Off Nested Updates with `updateAt()`

Sometimes you need to update a nested slice but don't want to keep a branch around. For this, use `updateAt()`:

```TypeScriptJSX
// One-off update to the profile name
userStore.updateAt(
  (root) => root.profile,  // get
  (profile) => ({ ...profile, name: 'David' }),  // mutator
  (root, newProfile) => ({ ...root, profile: newProfile })  // put
);
```

This is a lens-style API for when branches would be overkill.

## A Complete Example: User Profile Editor

Let's put it all together with a realistic component:

```TypeScriptJSX
import { h, createStore, watch } from 'auwla';

type User = {
  profile: { name: string; email: string };
  settings: { theme: 'light' | 'dark'; notifications: boolean };
  stats: { posts: number; followers: number };
};

const userStore = createStore<User>({
  profile: { name: 'Alice', email: 'alice@example.com' },
  settings: { theme: 'light', notifications: true },
  stats: { posts: 42, followers: 128 },
});

export function UserProfileEditor() {
  // Create focused branches for different sections
  const profileBranch = userStore.branch(
    (u) => u.profile,
    (u, profile) => ({ ...u, profile })
  );

  const settingsBranch = userStore.branch(
    (u) => u.settings,
    (u, settings) => ({ ...u, settings })
  );

  return (
    <div>
      <section>
        <h2>Profile</h2>
        <label>
          Name:
          <input
            value={profileBranch.value.value.name}
            onInput={(e) =>
              profileBranch.updateAt('name', (e.target as HTMLInputElement).value)
            }
          />
        </label>
        <label>
          Email:
          <input
            value={profileBranch.value.value.email}
            onInput={(e) =>
              profileBranch.updateAt('email', (e.target as HTMLInputElement).value)
            }
          />
        </label>
      </section>

      <section>
        <h2>Settings</h2>
        <label>
          Theme:
          <select
            value={settingsBranch.value.value.theme}
            onChange={(e) =>
              settingsBranch.updateAt('theme', (e.target as HTMLSelectElement).value as 'light' | 'dark')
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settingsBranch.value.value.notifications}
            onChange={() =>
              settingsBranch.update((s) => ({ ...s, notifications: !s.notifications }))
            }
          />
          Enable Notifications
        </label>
      </section>

      <section>
        <h2>Stats</h2>
        <p>Posts: {watch(userStore.value, (u) => u.stats.posts)}</p>
        <p>Followers: {watch(userStore.value, (u) => u.stats.followers)}</p>
        <button onClick={() => userStore.updateAtKey('stats', (s) => ({ ...s, posts: s.posts + 1 }))}>
          Publish Post
        </button>
      </section>
    </div>
  );
}
```

## Key Takeaways

- **`createStore` is not magic:** It's built on the same `ref` and immutable update principles you already know. It's just a cleaner API.
- **Selective rendering still applies:** The store's `value` is a `Ref<T>`. You use `watch` or `derive` to create reactive bindings to specific slices.
- **Choose the right operation:**
  - `set()` for full replacement
  - `update()` for general transformations
  - `patch()` for shallow top-level merges
  - `updateAtKey()` for single top-level key updates
  - `branch()` for working with nested slices
  - `updateAt()` for one-off nested updates
- **Branches are powerful:** They give you focused, ergonomic APIs for different parts of your state tree, making your components cleaner and easier to reason about.

## Working with Arrays: Task Manager Example

One of the most common patterns in real applications is managing **arrays of objects**. Let's explore the simple, practical ways to work with lists using `createStore`.

### Basic Setup: A Shopping Cart

Here's a simple shopping cart with an array of items:

```TypeScriptJSX
import { h, createStore, watch } from 'auwla';

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  total: number;
};

const cartStore = createStore<CartState>({
  items: [
    { id: 1, name: 'Coffee', price: 5, quantity: 2 },
    { id: 2, name: 'Tea', price: 3, quantity: 1 },
  ],
  total: 13,
});
```

### Adding an Item

Use `updateAtKey` to add a new item to the array:

```TypeScriptJSX
function addItem(name: string, price: number) {
  cartStore.updateAtKey('items', (items) => [
    ...items,
    { id: Date.now(), name, price, quantity: 1 }
  ]);
}

// Usage
addItem('Juice', 4);
```

**Pattern**: Spread the existing array and add the new item at the end.

### Removing an Item

Filter out the item you want to remove:

```TypeScriptJSX
function removeItem(id: number) {
  cartStore.updateAtKey('items', (items) => 
    items.filter(item => item.id !== id)
  );
}

// Usage
removeItem(1);
```

**Pattern**: Use `filter()` to keep only the items you want.

### Updating an Item

Map over the array and replace the item that matches:

```TypeScriptJSX
function increaseQuantity(id: number) {
  cartStore.updateAtKey('items', (items) =>
    items.map(item =>
      item.id === id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    )
  );
}

function updatePrice(id: number, newPrice: number) {
  cartStore.updateAtKey('items', (items) =>
    items.map(item =>
      item.id === id
        ? { ...item, price: newPrice }
        : item
    )
  );
}
```

**Pattern**: Use `map()` to iterate through the array. When you find the item you want to update, return a new object with the changes. Otherwise, return the item unchanged.

### Working with Multiple Items at Once

Sometimes you need to update many items in one go:

```TypeScriptJSX
// Clear all items
function clearCart() {
  cartStore.updateAtKey('items', () => []);
}

// Apply a discount to all items
function applyDiscount(percentage: number) {
  cartStore.updateAtKey('items', (items) =>
    items.map(item => ({
      ...item,
      price: item.price * (1 - percentage / 100)
    }))
  );
}

// Remove items with zero quantity
function removeEmptyItems() {
  cartStore.updateAtKey('items', (items) =>
    items.filter(item => item.quantity > 0)
  );
}
```

### Using It in a Component

Here's a complete component that uses these patterns:

```TypeScriptJSX
export function ShoppingCart() {
  // Create a branch focused on the items array
  const itemsBranch = cartStore.branch(
    (state) => state.items,
    (state, items) => ({ ...state, items })
  );

  return (
    <div>
      <h2>Shopping Cart</h2>
      <ul>
        {watch(itemsBranch.value, (items) =>
          items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <span>${item.price}</span>
              <span>Qty: {item.quantity}</span>
              <button onClick={() => increaseQuantity(item.id)}>+</button>
              <button onClick={() => removeItem(item.id)}>Remove</button>
            </li>
          ))
        )}
      </ul>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}
```

### Summary: Working with Arrays

The key patterns for arrays in `createStore`:

1. **Add**: `[...items, newItem]` - Spread existing items and add new one
2. **Remove**: `items.filter(item => item.id !== targetId)` - Filter out what you don't want
3. **Update**: `items.map(item => item.id === targetId ? {...item, field: newValue} : item)` - Map and replace the matching item

That's it! These three patterns handle 90% of array operations. `updateAtKey` makes it clean, and you don't need to rebuild the entire state tree—just the array you're changing.

With `createStore`, managing complex state becomes straightforward, predictable, and maintainable—while keeping Auwla's signature performance and control.
