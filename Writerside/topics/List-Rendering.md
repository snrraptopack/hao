# List Rendering: Efficient Dynamic Lists with the `For` Component

Rendering lists is one of the most common tasks in web applications. While you can use `watch` with `.map()` to render dynamic lists in Auwla, this approach is **highly inefficient**—every time the list changes, the entire list gets recreated from scratch. For optimal performance, Auwla provides a built-in `For` component that intelligently manages list updates.

> **The Performance Problem with `.map()`**
>
> When you use `.map()` inside a `watch`, changing a single item in your list causes the entire list to be destroyed and rebuilt. For a list of 1000 items, updating one item means creating 1000 new DOM nodes! The `For` component solves this with smart reconciliation.
{style="warning"}

## The Naive Approach: Why `.map()` is Expensive

Let's start with what seems natural but performs poorly:

<tabs>
<tab title="❌ Inefficient - Using .map()">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

type Todo = { id: number; title: string; completed: boolean };

const todos = ref<Todo[]>([
  { id: 1, title: 'Learn Auwla', completed: false },
  { id: 2, title: 'Build an app', completed: false },
  { id: 3, title: 'Ship to production', completed: false },
]);

function toggleTodo(id: number) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

export function TodoList() {
  return (
    <ul>
      {watch(todos, (list) =>
        list.map((todo) => (
          <li onClick={() => toggleTodo(todo.id)}>
            <input type="checkbox" checked={todo.completed} />
            {todo.title}
          </li>
        ))
      )}
    </ul>
  );
}
```

**What happens when you toggle one todo:**
1. `todos.value` changes
2. The `watch` callback runs
3. `.map()` creates 3 brand new `<li>` elements
4. All 3 old `<li>` elements are destroyed
5. All 3 new `<li>` elements are inserted into the DOM

**For a list of 1000 items, updating one item destroys and recreates 1000 DOM nodes!**

</tab>
<tab title="✅ Efficient - Using For">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Todo = { id: number; title: string; completed: boolean };

const todos = ref<Todo[]>([
  { id: 1, title: 'Learn Auwla', completed: false },
  { id: 2, title: 'Build an app', completed: false },
  { id: 3, title: 'Ship to production', completed: false },
]);

function toggleTodo(id: number) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

export function TodoList() {
  return (
    <ul>
      <For each={todos} key={(todo) => todo.id}>
        {(todo) => (
          <li onClick={() => toggleTodo(todo.id)}>
            <input type="checkbox" checked={todo.completed} />
            {todo.title}
          </li>
        )}
      </For>
    </ul>
  );
}
```

**What happens when you toggle one todo:**
1. `todos.value` changes
2. `For` detects which items changed using reference equality
3. Only the one changed todo gets a new DOM node
4. The other 2 todos keep their existing DOM nodes
5. DOM nodes are efficiently reordered if needed

**For a list of 1000 items, updating one item only recreates 1 DOM node!**

</tab>
</tabs>

> **Key Insight: Immutable Updates + Reference Equality**
>
> The `For` component uses **reference equality** (`Object.is`) to detect which items changed. When you use immutable patterns (like `.map()`), unchanged items keep the same reference, so `For` knows to reuse their DOM nodes. Only items with new references get re-rendered.
{style="tip"}

## How the `For` Component Works

The `For` component provides intelligent list reconciliation with these features:

1. **Keyed reconciliation**: Uses a stable key to track items across updates
2. **Reference equality detection**: Only re-renders items that actually changed
3. **Efficient DOM operations**: Minimizes insertions, deletions, and moves
4. **Primitive support**: Automatically uses value equality for primitives (strings, numbers)

### Basic Usage

```TypeScriptJSX
<For each={itemsRef} key={(item) => item.id}>
  {(item, index) => <div>{item.name}</div>}
</For>
```

**Props:**
- `each`: A `Ref<T[]>` containing your array
- `key`: A function that returns a stable, unique identifier for each item (defaults to index)
- `children` or `render`: A function that receives `(item, index)` and returns a Node

## Basic Examples

### Simple List with Primitives

<tabs>
<tab title="Strings/Numbers">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

const fruits = ref(['Apple', 'Banana', 'Cherry']);

export function FruitList() {
  return (
    <div>
      <h2>Fruits</h2>
      <ul>
        <For each={fruits}>
          {(fruit, index) => (
            <li>
              {index + 1}. {fruit}
            </li>
          )}
        </For>
      </ul>
      <button onClick={() => fruits.value = [...fruits.value, 'Date']}>
        Add Fruit
      </button>
    </div>
  );
}
```

**Note**: For primitives, `For` uses value equality (`===`), so it works naturally without needing to specify a key function.

</tab>
<tab title="With Key Function">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type User = { id: number; name: string; age: number };

const users = ref<User[]>([
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 },
]);

export function UserList() {
  return (
    <div>
      <h2>Users</h2>
      <ul>
        <For each={users} key={(user) => user.id}>
          {(user) => (
            <li>
              <strong>{user.name}</strong> - {user.age} years old
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**Best Practice**: Always provide a `key` function that returns a unique, stable identifier (like `id`) for objects. This enables efficient reordering.

</tab>
</tabs>

## Interactive List Operations

Let's see how `For` handles common list operations efficiently. Each example shows a complete, working component:

### CRUD Operations

<tabs>
<tab title="Complete Task Manager">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Task = { id: number; title: string; completed: boolean };

const tasks = ref<Task[]>([
  { id: 1, title: 'Write docs', completed: false },
]);

let nextId = 2;

function addTask(title: string) {
  tasks.value = [
    ...tasks.value,
    { id: nextId++, title, completed: false }
  ];
}

function removeTask(id: number) {
  tasks.value = tasks.value.filter(task => task.id !== id);
}

function toggleTask(id: number) {
  tasks.value = tasks.value.map(task =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  );
}

export function TaskManager() {
  return (
    <div class="task-manager">
      <div class="controls">
        <input
          type="text"
          placeholder="New task..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              const input = e.target as HTMLInputElement;
              addTask(input.value);
              input.value = '';
            }
          }}
        />
        <button onClick={() => addTask('New Task')}>Add Task</button>
      </div>

      <ul class="task-list">
        <For each={tasks} key={(task) => task.id}>
          {(task) => (
            <li class={task.completed ? 'completed' : ''}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
              />
              <span>{task.title}</span>
              <button onClick={() => removeTask(task.id)}>Delete</button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**What happens:**
- **Add**: Only new task's DOM node is created
- **Remove**: Only deleted task's DOM node is removed
- **Toggle**: Only the updated task's DOM node is recreated
- Other tasks keep their existing DOM nodes

</tab>
<tab title="Adding Items Only">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Task = { id: number; title: string };

const tasks = ref<Task[]>([
  { id: 1, title: 'Write docs' },
]);

let nextId = 2;

function addTask(title: string) {
  tasks.value = [...tasks.value, { id: nextId++, title }];
}

export function AddTaskExample() {
  return (
    <div>
      <button onClick={() => addTask(`Task ${nextId}`)}>
        Add Task
      </button>
      <ul>
        <For each={tasks} key={(task) => task.id}>
          {(task) => <li>{task.title}</li>}
        </For>
      </ul>
    </div>
  );
}
```

**Result**: Only the new task's DOM node is created. Existing tasks keep their nodes.

</tab>
<tab title="Removing Items Only">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Task = { id: number; title: string };

const tasks = ref<Task[]>([
  { id: 1, title: 'Write docs' },
  { id: 2, title: 'Fix bugs' },
  { id: 3, title: 'Deploy' },
]);

function removeTask(id: number) {
  tasks.value = tasks.value.filter(task => task.id !== id);
}

export function RemoveTaskExample() {
  return (
    <div>
      <ul>
        <For each={tasks} key={(task) => task.id}>
          {(task) => (
            <li>
              {task.title}
              <button onClick={() => removeTask(task.id)}>×</button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**Result**: Only the removed task's DOM node is deleted. Other tasks keep their nodes.

</tab>
<tab title="Updating Items Only">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Task = { id: number; title: string; priority: 'low' | 'high' };

const tasks = ref<Task[]>([
  { id: 1, title: 'Write docs', priority: 'low' },
  { id: 2, title: 'Fix bugs', priority: 'high' },
  { id: 3, title: 'Deploy', priority: 'low' },
]);

function togglePriority(id: number) {
  tasks.value = tasks.value.map(task =>
    task.id === id
      ? { ...task, priority: task.priority === 'low' ? 'high' : 'low' }
      : task  // Unchanged tasks keep same reference!
  );
}

export function UpdateTaskExample() {
  return (
    <div>
      <ul>
        <For each={tasks} key={(task) => task.id}>
          {(task) => (
            <li class={task.priority === 'high' ? 'urgent' : 'normal'}>
              <span>{task.title}</span>
              <button onClick={() => togglePriority(task.id)}>
                {task.priority === 'high' ? '⬇️ Lower' : '⬆️ Raise'}
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**Result**: Only the updated task's DOM node is recreated. Tasks with unchanged references keep their nodes.

</tab>
</tabs>

### Reordering and Sorting

<tabs>
<tab title="Shuffle List">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Task = { id: number; title: string };

const tasks = ref<Task[]>([
  { id: 1, title: 'First Task' },
  { id: 2, title: 'Second Task' },
  { id: 3, title: 'Third Task' },
  { id: 4, title: 'Fourth Task' },
]);

function shuffle() {
  const shuffled = [...tasks.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  tasks.value = shuffled;
}

export function ShuffleExample() {
  return (
    <div>
      <button onClick={shuffle}>🔀 Shuffle Tasks</button>
      <ul>
        <For each={tasks} key={(task) => task.id}>
          {(task) => (
            <li>
              <span class="task-id">#{task.id}</span>
              {task.title}
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**Result**: DOM nodes are efficiently moved to their new positions. No nodes are recreated!

</tab>
<tab title="Sort by Property">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Person = { id: number; name: string; age: number };

const people = ref<Person[]>([
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Charlie', age: 35 },
  { id: 4, name: 'Diana', age: 28 },
]);

function sortByName() {
  tasks.value = [...tasks.value].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}

function sortByAge() {
  tasks.value = [...tasks.value].sort((a, b) => a.age - b.age);
}

export function SortExample() {
  return (
    <div>
      <div class="controls">
        <button onClick={sortByName}>Sort by Name</button>
        <button onClick={sortByAge}>Sort by Age</button>
      </div>
      <ul>
        <For each={people} key={(person) => person.id}>
          {(person) => (
            <li>
              <strong>{person.name}</strong> - {person.age} years old
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
```

**Result**: Items are efficiently reordered without recreating DOM nodes.

</tab>
<tab title="Move Items Up/Down">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

type Item = { id: number; text: string };

const items = ref<Item[]>([
  { id: 1, text: 'First' },
  { id: 2, text: 'Second' },
  { id: 3, text: 'Third' },
]);

function moveUp(index: number) {
  if (index === 0) return;
  const newItems = [...items.value];
  [newItems[index - 1], newItems[index]] = [newItems[index]!, newItems[index - 1]!];
  items.value = newItems;
}

function moveDown(index: number) {
  if (index === items.value.length - 1) return;
  const newItems = [...items.value];
  [newItems[index], newItems[index + 1]] = [newItems[index + 1]!, newItems[index]!];
  items.value = newItems;
}

export function MoveItemsExample() {
  return (
    <ul>
      <For each={items} key={(item) => item.id}>
        {(item, index) => (
          <li>
            <span>{item.text}</span>
            <div class="controls">
              <button onClick={() => moveUp(index)}>⬆️</button>
              <button onClick={() => moveDown(index)}>⬇️</button>
            </div>
          </li>
        )}
      </For>
    </ul>
  );
}
```

**Result**: Adjacent items swap positions efficiently without full re-render.

</tab>
</tabs>

> **Why Keys Matter**
>
> The `key` function tells `For` how to track items across updates. Without keys (or using index as key), reordering becomes expensive. With proper keys (like unique IDs), `For` can efficiently move existing DOM nodes instead of recreating them.
{style="tip"}

## Advanced Pattern: Combining `For` with `When`

One of the most powerful patterns is combining `For` for list rendering with `When` for conditional logic within each item:

<tabs>
<tab title="Todo List with Status">

```TypeScriptJSX
import { h, ref, derive } from 'auwla';
import { For, When } from 'auwla';

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  editing: boolean;
};

const todos = ref<Todo[]>([
  { id: 1, title: 'Learn Auwla', completed: false, editing: false },
  { id: 2, title: 'Build an app', completed: true, editing: false },
]);

function toggleComplete(id: number) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

function toggleEdit(id: number) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, editing: !todo.editing } : todo
  );
}

function updateTitle(id: number, newTitle: string) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, title: newTitle, editing: false } : todo
  );
}

export function TodoList() {
  return (
    <ul>
      <For each={todos} key={(todo) => todo.id}>
        {(todo) => {
          // Derive reactive booleans for each todo item
          const isEditing = derive(todos, (list) => 
            list.find(t => t.id === todo.id)?.editing || false
          );
          const isCompleted = derive(todos, (list) =>
            list.find(t => t.id === todo.id)?.completed || false
          );

          return (
            <li class={watch(isCompleted, c => c ? 'completed' : '')}>
              <When>
                {isEditing}
                {() => (
                  <input
                    type="text"
                    value={todo.title}
                    onBlur={(e) => updateTitle(todo.id, (e.target as HTMLInputElement).value)}
                  />
                )}
                {() => (
                  <div>
                    <input
                      type="checkbox"
                      checked={watch(isCompleted, c => c)}
                      onChange={() => toggleComplete(todo.id)}
                    />
                    <span onClick={() => toggleEdit(todo.id)}>
                      {todo.title}
                    </span>
                  </div>
                )}
              </When>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
```

**What's happening:**
- `For` efficiently manages the list of todos
- Each todo has its own `When` component for edit mode
- `derive` creates reactive refs for each todo's state
- Only the affected todo re-renders when its state changes

</tab>
<tab title="User List with Loading States">

```TypeScriptJSX
import { h, ref, derive } from 'auwla';
import { For, When } from 'auwla';

type User = {
  id: number;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'away';
};

const users = ref<User[]>([
  { id: 1, name: 'Alice', email: 'alice@example.com', status: 'online' },
  { id: 2, name: 'Bob', email: 'bob@example.com', status: 'offline' },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', status: 'away' },
]);

export function UserList() {
  return (
    <div>
      <h2>Team Members</h2>
      <ul class="user-list">
        <For each={users} key={(user) => user.id}>
          {(user) => {
            // Derive status booleans for conditional rendering
            const isOnline = derive(users, (list) =>
              list.find(u => u.id === user.id)?.status === 'online'
            );
            const isAway = derive(users, (list) =>
              list.find(u => u.id === user.id)?.status === 'away'
            );

            return (
              <li class="user-card">
                <div class="user-info">
                  <strong>{user.name}</strong>
                  <span class="email">{user.email}</span>
                </div>
                <When>
                  {isOnline}
                  {() => <span class="status online">🟢 Online</span>}
                  {isAway}
                  {() => <span class="status away">🟡 Away</span>}
                  {() => <span class="status offline">⚫ Offline</span>}
                </When>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
}
```

**Pattern Benefits:**
- Clean separation of list logic (`For`) and item logic (`When`)
- Each item independently manages its conditional rendering
- Optimal performance—only changed items re-render

</tab>
</tabs>

> **Advanced Pattern: For + When**
>
> Combining `For` for list management with `When` for item-level conditions creates powerful, declarative UIs. The `For` handles list updates efficiently, while `When` manages conditional rendering within each item. Use `derive` to create reactive refs for item-specific state.
{style="tip"}

## Real-World Example: Shopping Cart

Here's a complete shopping cart that demonstrates all the concepts:

```TypeScriptJSX
import { h, ref, derive } from 'auwla';
import { For, When } from 'auwla';

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  inStock: boolean;
};

const cart = ref<CartItem[]>([
  { id: 1, name: 'Laptop', price: 999, quantity: 1, inStock: true },
  { id: 2, name: 'Mouse', price: 29, quantity: 2, inStock: true },
  { id: 3, name: 'Keyboard', price: 79, quantity: 1, inStock: false },
]);

function updateQuantity(id: number, delta: number) {
  cart.value = cart.value.map(item =>
    item.id === id
      ? { ...item, quantity: Math.max(0, item.quantity + delta) }
      : item
  ).filter(item => item.quantity > 0);
}

function removeItem(id: number) {
  cart.value = cart.value.filter(item => item.id !== id);
}

export function ShoppingCart() {
  // Derive total from cart
  const total = derive(cart, (items) =>
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  );

  const isEmpty = derive(cart, (items) => items.length === 0);

  return (
    <div class="shopping-cart">
      <h2>Shopping Cart</h2>
      
      <When>
        {isEmpty}
        {() => (
          <div class="empty-cart">
            <p>Your cart is empty</p>
          </div>
        )}
        {() => (
          <div>
            <ul class="cart-items">
              <For each={cart} key={(item) => item.id}>
                {(item) => {
                  const outOfStock = derive(cart, (items) =>
                    !items.find(i => i.id === item.id)?.inStock
                  );

                  return (
                    <li class="cart-item">
                      <div class="item-details">
                        <h3>{item.name}</h3>
                        <p class="price">${item.price}</p>
                        
                        <When>
                          {outOfStock}
                          {() => (
                            <span class="out-of-stock">⚠️ Out of Stock</span>
                          )}
                          {() => null}
                        </When>
                      </div>
                      
                      <div class="item-controls">
                        <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                        <span class="quantity">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                        <button
                          class="remove"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div class="item-total">
                        ${item.price * item.quantity}
                      </div>
                    </li>
                  );
                }}
              </For>
            </ul>
            
            <div class="cart-summary">
              <h3>Total: ${total}</h3>
              <button class="checkout">Checkout</button>
            </div>
          </div>
        )}
      </When>
    </div>
  );
}
```

**What makes this efficient:**
- `For` only re-renders items that change (quantity, stock status)
- `When` handles empty cart state at the top level
- Each item has its own `When` for out-of-stock display
- `derive` creates reactive computed values (total, stock status)
- Removing an item only removes that one DOM node

## Framework Comparison: List Rendering

<tabs>
<tab title="Auwla - For Component">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { For } from 'auwla';

const items = ref([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' },
]);

function updateItem(id: number) {
  items.value = items.value.map(item =>
    item.id === id ? { ...item, name: 'Updated' } : item
  );
}

export function List() {
  return (
    <ul>
      <For each={items} key={(item) => item.id}>
        {(item) => (
          <li onClick={() => updateItem(item.id)}>
            {item.name}
          </li>
        )}
      </For>
    </ul>
  );
}

// Only the updated item re-renders
// Smart reconciliation with reference equality
```

</tab>
<tab title="React - Array.map()">

```TypeScriptJSX
import { useState } from 'react';

const List = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ]);

  const updateItem = (id: number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, name: 'Updated' } : item
    ));
  };

  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => updateItem(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
};

// Component re-renders, all JSX re-executes
// Virtual DOM diffing determines actual DOM updates
```

</tab>
<tab title="Vue - v-for Directive">

```html
<script setup>
import { ref } from 'vue';

const items = ref([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' }
]);

const updateItem = (id) => {
  const item = items.value.find(i => i.id === id);
  if (item) item.name = 'Updated'; // Deep reactivity
};
</script>

<template>
  <ul>
    <li 
      v-for="item in items" 
      :key="item.id"
      @click="updateItem(item.id)"
    >
      {{ item.name }}
    </li>
  </ul>
</template>
```

</tab>
</tabs>

## Performance Tips

> **Immutable Updates Are Key**
>
> The `For` component's efficiency relies on immutable update patterns. When you use `.map()`, `.filter()`, or spread operators, unchanged items keep their references, so `For` knows to reuse their DOM nodes.
>
> ```typescript
> // ✅ Good - unchanged items keep references
> todos.value = todos.value.map(t => 
>   t.id === 5 ? { ...t, done: true } : t
> );
>
> // ❌ Bad - all items get new references
> todos.value = todos.value.map(t => ({ ...t }));
> ```
{style="tip"}

### When to Use Index vs ID Keys

<tabs>
<tab title="Use ID Keys">

```TypeScriptJSX
// ✅ Use unique IDs when items can be:
// - Reordered
// - Filtered
// - Inserted in the middle

const tasks = ref([
  { id: 1, title: 'Task 1' },
  { id: 2, title: 'Task 2' },
]);

<For each={tasks} key={(task) => task.id}>
  {(task) => <li>{task.title}</li>}
</For>
```

</tab>
<tab title="Use Index (Carefully)">

```TypeScriptJSX
// ⚠️ Use index only when:
// - List is static or only appends
// - Order never changes
// - Items are never inserted/removed from middle

const messages = ref(['Hello', 'World']);

<For each={messages}>
  {(msg, index) => <li>{index}: {msg}</li>}
</For>

// Default key is index if not provided
```

</tab>
</tabs>

## Best Practices Summary

> **Do's and Don'ts**
>
> ✅ **Do**: Use `For` for dynamic lists instead of `.map()`  
> ✅ **Do**: Provide stable, unique `key` functions (prefer IDs over indexes)  
> ✅ **Do**: Use immutable update patterns (`.map()`, `.filter()`, spread)  
> ✅ **Do**: Combine `For` with `When` for item-level conditional logic  
> ✅ **Do**: Use `derive` for item-specific computed values  
>
> ❌ **Don't**: Use `.map()` inside `watch` for large lists  
> ❌ **Don't**: Mutate array items directly—use immutable updates  
> ❌ **Don't**: Use index as key when items can be reordered  
> ❌ **Don't**: Create new references for unchanged items  
{style="warning"}

## Key Takeaways

**The `For` component is essential for performance**: It uses smart reconciliation to only update changed items, making list rendering dramatically more efficient than `.map()`.

**Reference equality is the key**: By using immutable update patterns, unchanged items keep their references, allowing `For` to reuse existing DOM nodes.

**Combine with `When` for powerful patterns**: Use `For` for the list structure and `When` for item-level conditional rendering to create clean, maintainable UIs.

**Keys matter for reordering**: Provide stable, unique keys (like IDs) to enable efficient reordering. Index keys work for static lists but break down when items move.

**Works seamlessly with `createStore`**: The `For` component's reference equality strategy pairs perfectly with `createStore`'s structural sharing pattern.

With the `For` component, rendering dynamic lists in Auwla becomes both performant and maintainable—you get fine-grained control without the complexity.
