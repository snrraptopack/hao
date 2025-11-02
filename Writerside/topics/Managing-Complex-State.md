# Thinking in Auwla: The Art of Selective Rendering

Auwla takes a different approach to reactivity than many frameworks you might be familiar with. Instead of re-rendering entire components when state changes, Auwla performs **selective re-rendering**: only the specific parts of the UI that explicitly subscribe to reactive sources will update.

This might feel strange at first, but once the mental model clicks, you'll find it gives you incredible control and performance. Let's explore this through a practical example: building a Todo list.

> **Coming from React or Vue?**
>
> If you're familiar with React's component re-rendering or Vue's template reactivity, Auwla's selective rendering will feel different. The key shift: **you explicitly subscribe each binding to its reactive source**. This gives you surgical precision over what updates and when.
{style="note"}

## The Golden Rule: Understanding `.value`

Before we dive into the example, here's the fundamental rule you need to understand about Auwla's reactivity:

**You can mutate `.value` itself, and it will trigger an update. But mutating properties *inside* `.value` will not.**

<tabs>
<tab title="Auwla">

```TypeScriptJSX
const count = ref(5);
count.value = 10; // ✅ This works! The ref detects the change.

const user = ref({ name: 'Alice', age: 30 });
user.value.age = 31; // ❌ This does NOT trigger an update!
user.value = { name: 'Alice', age: 31 }; // ✅ This works! We replaced the entire object.
```

</tab>
<tab title="React (for comparison)">

```TypeScriptJSX
const [count, setCount] = useState(5);
setCount(10); // ✅ Works - must use setter

const [user, setUser] = useState({ name: 'Alice', age: 30 });
// ❌ Can't mutate directly either
user.age = 31; // Won't trigger re-render

// ✅ Must create new object
setUser({ ...user, age: 31 });
```

</tab>
<tab title="Vue (for comparison)">

```TypeScriptJSX
const user = reactive({ name: 'Alice', age: 30 });
user.age = 31; // ✅ Works! Vue uses Proxy for deep reactivity

// Or with ref
const userRef = ref({ name: 'Alice', age: 30 });
userRef.value.age = 31; // ✅ Also works in Vue
```

</tab>
</tabs>

> **Why Shallow?**
>
> Because `ref` is **shallow by default**. It only tracks changes to the immediate `.value` property, not nested properties. This is a deliberate design choice for:
> - **Performance**: No deep proxy overhead
> - **Predictability**: You control exactly when updates happen
> - **Simplicity**: Clear data flow without magic
{style="tip"}

This rule is the foundation of everything that follows. Keep it in mind as we work through the Todo example.

## Understanding What JSX Needs: A Ref to Subscribe To

Before we dive into the Todo example, let's clarify something that might confuse you: **Why does `{count}` work directly in JSX, but attributes need `watch` or `derive`?**

Here's a simple counter example:

```TypeScriptJSX
import { h, ref } from 'auwla';

const count = ref(0);

export function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => count.value++}>Increment</button>
    </div>
  );
}
```

This works perfectly! When you click the button, the count updates in the UI. No `watch`, no `derive`. Just `{count}`. Why?

**The answer:** Auwla's JSX runtime is smart about text interpolation. When you write `{count}` where text is expected, the runtime recognizes that `count` is a `ref` and automatically subscribes a text node to it. It's essentially doing the subscription work for you behind the scenes.

But here's the key insight: **What the system actually needs is a `ref` to subscribe to.**

- `{count}` works because `count` itself is a `ref`.
- `{count.value}` would NOT work reactively, because `.value` gives you the plain number, not the `ref`.

Now, let's talk about attributes like `style` or `class`. When you write:

```TypeScriptJSX
// This won't work reactively
<div style={{ color: someBoolean ? 'red' : 'blue' }} />
```

The JSX runtime receives a plain object `{ color: 'red' }` or `{ color: 'blue' }`. There's no `ref` here, so there's nothing to subscribe to. The style is set once and forgotten.

To make an attribute reactive, you need to give it a `ref`. But how do you create a `ref` that computes a value from another `ref`? That's exactly what `watch` and `derive` do:

```TypeScriptJSX
const isActive = ref(false);

// watch returns a NEW ref that computes its value from isActive
<div style={watch([isActive], ([active]) => active ? 'color:red' : 'color:blue')} />

// OR use derive, which also returns a ref
const color = derive(() => isActive.value ? 'color:red' : 'color:blue');
<div style={color} />
```

Both `watch` and `derive` return a `ref`. That's what the JSX runtime needs to create a subscription.

> **The Mental Model**
>
> - JSX needs a `ref` to subscribe to for reactive updates
> - **Text interpolation**: `{myRef}` works directly
> - **Attributes**: Pass a `ref` created by `watch` or `derive`, or pass an existing `ref` if the value doesn't need transformation
{style="note"}

Now that we've established this foundation, let's see where things go wrong in a real example.

## Framework Comparison: A Simple Counter

Let's compare how the same counter works across frameworks to understand Auwla's approach:

<tabs>
<tab title="Auwla">

```TypeScriptJSX
import { h, ref } from 'auwla';

const count = ref(0);

export function Counter() {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => count.value++}>
        Increment
      </button>
    </div>
  );
}

// State lives outside component
// Only the text node updates
// No component re-render
```

</tab>
<tab title="React">

```TypeScriptJSX
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// State tied to component instance
// Entire component re-renders
// All JSX re-executes
```

</tab>
<tab title="Vue 3">

```HTML
<script setup>
import { ref } from 'vue';

```vue
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="count++">
      Increment
    </button>
  </div>
</template>

<!-- Template compiler creates subscriptions -->
<!-- Automatic dependency tracking -->
<!-- Similar to Auwla but template-based -->
```

</tab>
</tabs>

> **Key Difference**
>
> - **React**: Component re-renders → All JSX re-executes → Virtual DOM diffing
> - **Vue**: Template compiler → Auto-tracked dependencies → Selective updates
> - **Auwla**: Explicit subscriptions → Surgical updates → No virtual DOM, no compiler magic
{style="tip"}

## The Naive Todo List (and why it doesn't work)

Let's say you're coming from a framework like React or Vue, where updating state automatically re-renders your component and all your bindings recompute. You might write a Todo list like this:

```TypeScriptJSX
import { h, ref } from 'auwla';

type Todo = { id: number; text: string; completed: boolean };

const todos = ref<Todo[]>([
  { id: 1, text: 'Learn Auwla', completed: true },
  { id: 2, text: 'Build an app', completed: false },
]);

function toggleTodo(id: number) {
  // We're doing an immutable update here: creating a new array and new objects
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

export function TodoList_Broken() {
  return (
    <ul>
      {todos.value.map(todo => (
        <li
          // We're reading todo.completed here to set the style
          style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
          onClick={() => toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

You click a todo item to toggle it. The `toggleTodo` function runs. It correctly creates a new array with a new object. But... the UI doesn't update. The strikethrough doesn't appear or disappear. What's going on?

> **Why It Fails**
>
> When you write `style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}`, you're reading the `todo.completed` boolean *once*, when the component first renders. The `style` attribute isn't subscribed to anything reactive. Auwla has no way of knowing that this particular piece of the UI should update later.
{style="warning"}

In Auwla, you must **explicitly tell each binding what it should watch**. If a piece of the UI might change, you need to wire it up to a reactive source using `ref`, `watch`, or `derive`.

## Solution 1: Make Each Item's `completed` a Ref (Targeted Updates)

One way to fix this is to make the part that changes—`completed`—into its own `ref`. Now we can use `watch` to create a reactive binding that subscribes to that specific `ref`.

<tabs>
<tab title="Auwla - Per-Item Refs">

```TypeScriptJSX
import { h, ref, watch, type Ref } from 'auwla';

type Todo = { id: number; text: string; completed: Ref<boolean> };

const todos = ref<Todo[]>([
  { id: 1, text: 'Learn Auwla', completed: ref(true) },
  { id: 2, text: 'Build an app', completed: ref(false) },
]);

function toggleTodo(id: number) {
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    // Directly mutate the completed ref
    todo.completed.value = !todo.completed.value;
  }
}

export function TodoList_PerItemRef() {
  return (
    <ul>
      {todos.value.map(todo => (
        <li
          // Style watches individual todo.completed ref
          style={watch(todo.completed, v => 
            v ? 'text-decoration:line-through' : 'none'
          )}
          onClick={() => toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Result**: Only the specific style attribute updates when toggled. Ultra-precise!

</tab>
<tab title="React - Component Re-render">

```TypeScriptJSX
import { useState } from 'react';

type Todo = { id: number; text: string; completed: boolean };

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
      { id: 1, text: 'Learn React', completed: true },
      { id: 2, text: 'Build an app', completed: false },
  ]);

  function toggleTodo(id: number) {
    setTodos(todos.map(todo =>
      todo.id === id 
          ? { ...todo, completed: !todo.completed } 
        : todo
    ));
  }

  return (
    <ul>
      {todos.map(todo => (
        <li
          key={todo.id}
          style={{ 
            textDecoration: todo.completed ? 'line-through' : 'none' 
          }}
          onClick={() => toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Result**: Entire component re-renders. All JSX re-executes. Virtual DOM diffing applies changes.

</tab>
<tab title="Vue - Template Reactivity">

```HTML
<script setup>
import { ref } from 'vue';

```html
  { id: 1, text: 'Learn Vue', completed: true },
  { id: 2, text: 'Build an app', completed: false }
]);

function toggleTodo(id) {
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed; // Deep reactivity!
  }
}
</script>

<template>
  <ul>
    <li 
      v-for="todo in todos" 
      :key="todo.id"
      :style="{ 
        textDecoration: todo.completed ? 'line-through' : 'none' 
      }"
      @click="toggleTodo(todo.id)"
    >
      {{ todo.text }}
    </li>
  </ul>
</template>
```

**Result**: Template compiler tracks dependencies. Only affected DOM nodes update.

</tab>
</tabs>

> **Why Auwla's Approach Wins for Performance**
>
> - **React**: Entire component function re-executes, creates new virtual DOM, diffs, then applies changes
> - **Vue**: Template compiler creates dependencies, but still needs to re-evaluate expressions
> - **Auwla**: Only the specific style attribute's subscription callback runs. No component re-execution, no virtual DOM, no diffing
{style="tip"}

## Solution 2: Keep Plain Data and Watch the Entire List (Immutable Updates)

If you prefer to keep your data as plain objects and arrays (which is a very valid choice, especially if you're working with data from an API), you can still make it work. The trick is to make the `style` binding watch the entire `todos` list.

<tabs>
<tab title="Auwla - Watch List">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

type Todo = { id: number; text: string; completed: boolean };

const todos = ref<Todo[]>([
  { id: 1, text: 'Learn Auwla', completed: true },
  { id: 2, text: 'Build an app', completed: false },
]);

function toggleTodo(id: number) {
  // Immutable update: create a new array with a new object
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
}

export function TodoList_WatchList() {
  return (
    <ul>
      {todos.value.map((todo, index) => (
        <li
          // Style watches entire todos list, reads current item by index
          style={watch(todos, list => 
            list[index].completed ? 'text-decoration:line-through' : 'none'
          )}
          onClick={() => toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Result**: All style bindings re-evaluate, but only changed DOM attributes actually update.

</tab>
<tab title="React - Same Pattern">

```TypeScriptJSX
import { useState } from 'react';

type Todo = { id: number; text: string; completed: boolean };

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Build an app', completed: false },
  ]);

  function toggleTodo(id: number) {
    setTodos(todos.map(todo =>
      todo.id === id 
        ? { ...todo, completed: !todo.completed } 
        : todo
    ));
  }

  return (
    <ul>
      {todos.map(todo => (
        <li
          key={todo.id}
          style={{ 
            textDecoration: todo.completed ? 'line-through' : 'none' 
          }}
          onClick={() => toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Result**: Entire component re-renders. Same immutable pattern, but full component re-execution.

</tab>
</tabs>

**The trade-off:**
- ✅ **Pro:** Your data remains plain and simple. No nested `ref`s. Great for API data or immutable patterns.
- ✅ **Pro:** This is the standard pattern for immutable state management, familiar from Redux/Zustand.
- ⚠️ **Con:** When you toggle one todo, *every* `watch` binding in the list re-runs because they all subscribe to the same `todos` ref.
- ⚠️ **Con:** Using `index` assumes stable list order. For dynamic lists, find items by stable `id` instead.

## Performance Comparison: What Actually Happens?

Let's break down what happens when you toggle a todo in each framework:

<table>
<tr>
<th>Framework</th>
<th>What Executes</th>
<th>Updates Applied</th>
</tr>
<tr>
<td><b>React</b></td>
<td>
• Component function re-executes<br/>
• All JSX expressions re-evaluate<br/>
• Virtual DOM created<br/>
• Virtual DOM diff<br/>
• Real DOM patched
</td>
<td>Only changed attributes</td>
</tr>
<tr>
<td><b>Vue 3</b></td>
<td>
• Reactive dependencies trigger<br/>
• Template expressions re-evaluate<br/>
• Minimal component update<br/>
• Direct DOM patch
</td>
<td>Only changed attributes</td>
</tr>
<tr>
<td><b>Auwla (Per-Item)</b></td>
<td>
• Single watch callback executes<br/>
• Direct DOM update
</td>
<td>Only the single style attribute</td>
</tr>
<tr>
<td><b>Auwla (Watch List)</b></td>
<td>
• All watch callbacks execute<br/>
• Direct DOM updates for changes
</td>
<td>Only changed attributes</td>
</tr>
</table>

> **When Auwla Shines**
>
> Auwla's selective rendering gives you the finest-grained control possible. You can optimize to the level of individual attributes if needed, or keep things simple with list-level watching. The choice is yours, and both are valid.
{style="tip"}

## Key Takeaways

**Selective rendering is the core principle**: Auwla only updates bindings that explicitly subscribe to reactive sources. You control what updates and when.

**The `.value` rule matters**: You can mutate `ref.value` itself, but not properties nested inside it. For nested changes, you must reassign the entire `.value` with a new object or array.

**Two valid patterns**:
- **Targeted updates with nested refs**: Best for pinpoint efficiency. Each binding watches exactly what it needs.
- **Immutable updates with list-level watching**: Best for simplicity and working with plain data. Every binding that depends on the list will re-evaluate.

**`watch` is your friend for attributes**: Inline `watch` calls for `class`, `style`, and other attributes are concise and expressive.

> **Mental Model Shift**
>
> - **React**: "State changes → Component re-renders → UI updates"
> - **Vue**: "State changes → Template dependencies trigger → UI updates"
> - **Auwla**: "State changes → Subscribed bindings update → UI updates"
>
> In Auwla, you're wiring subscriptions, not triggering re-renders.
{style="note"}

Once you internalize this mental model, the UI feels "live" and responsive without the overhead of re-rendering entire components. You're in full control.

In the next section, we'll introduce `createStore`, which builds on these principles to make managing larger, more complex state structures much more ergonomic—while keeping selective rendering intact.
