# Custom Reactive Framework

A lightweight, TypeScript-first reactive UI framework with fine-grained reactivity and zero dependencies.

## Features

✅ **Fine-grained reactivity** - Only updates what changed  
✅ **Keyed list diffing** - Efficient list rendering with O(1) updates  
✅ **Memory leak prevention** - Automatic cleanup of subscriptions  
✅ **Type-safe** - Full TypeScript support with IntelliSense  
✅ **Zero dependencies** - No external libraries required  
✅ **Tailwind-friendly** - Works seamlessly with utility CSS  
✅ **Component composition** - Build reusable UI components  

## Core Concepts

### 1. Reactive State with `ref()`

```typescript
import { ref } from "./state";

const count = ref(0);
count.value++; // Updates value and notifies subscribers

// Subscribe to changes
const unsubscribe = count.subscribe((newValue) => {
  console.log('Count changed:', newValue);
});

// Cleanup when done
unsubscribe();
```

### 2. Computed Values with `watch()`

```typescript
import { watch } from "./state";

// Single source
const count = ref(0);
const doubled = watch(count, (v) => v * 2);
console.log(doubled.value); // 0

count.value = 5;
console.log(doubled.value); // 10

// Multiple sources
const firstName = ref('John');
const lastName = ref('Doe');
const fullName = watch([firstName, lastName], ([f, l]) => `${f} ${l}`);

// Side effects (no return value)
watch(todos, (newTodos) => {
  localStorage.setItem('todos', JSON.stringify(newTodos));
});
```

### 3. Building UI with `Component()`

```typescript
import { Component } from "./dsl";
import { ref, watch } from "./state";

const count = ref(0);

const App = Component((ui) => {
  ui.Button({
    text: watch(count, c => `Count: ${c}`),
    className: "bg-blue-500 text-white px-4 py-2 rounded",
    on: { click: () => count.value++ }
  });
  
  ui.Text({
    value: count,
    formatter: (v) => `Total: ${v}`,
    className: "text-2xl font-bold"
  });
});

document.getElementById('app').appendChild(App);
```

### 4. Nesting with Builder Functions

```typescript
ui.Div({ className: "container" }, (ui) => {
  ui.Div({ className: "flex gap-4" }, (ui) => {
    ui.Button({ text: "Add" });
    ui.Button({ text: "Clear" });
  });
});
```

### 5. Lists with Keyed Rendering

```typescript
const todos = ref([
  { id: 1, text: ref("Buy milk"), done: ref(false) },
  { id: 2, text: ref("Walk dog"), done: ref(true) }
]);

ui.List({
  items: todos,
  className: "space-y-2",
  key: (todo) => todo.id, // Stable key for efficient updates
  render: (todo, index, ui) => {
    ui.Div({ className: "flex gap-2" }, (ui) => {
      ui.Input({
        type: "checkbox",
        checked: todo.done,
        on: { change: () => todo.done.value = !todo.done.value }
      });
      ui.Text({
        value: todo.text,
        className: watch(todo.done, d => 
          d ? "line-through text-gray-400" : "text-gray-800"
        )
      });
    });
  }
});
```

### 6. Conditional Rendering

```typescript
const isLoggedIn = ref(false);

ui.When(isLoggedIn, (ui) => {
  ui.Text({ value: "Welcome back!" });
  ui.Button({ text: "Logout" });
}).Else((ui) => {
  ui.Text({ value: "Please login" });
  ui.Button({ text: "Login" });
});
```

### 7. Component Composition

```typescript
// Define reusable component
function StatsCard(config: { count: Ref<number>; label: string }) {
  return Component((ui) => {
    ui.Div({ className: "bg-blue-100 rounded-xl p-4" }, (ui) => {
      ui.Text({
        value: config.count,
        formatter: (v) => String(v),
        className: "text-3xl font-bold"
      });
      ui.Text({ value: config.label });
    });
  });
}

// Use it
ui.Div({ className: "grid grid-cols-3 gap-4" }, (ui) => {
  ui.append(StatsCard({ count: totalCount, label: "Total" }))
    .append(StatsCard({ count: activeCount, label: "Active" }))
    .append(StatsCard({ count: completedCount, label: "Done" }));
});
```

## Performance

### Keyed List Optimization

The framework uses a **keyed diffing algorithm** that only updates what changed:

| Action | Before Optimization | After Optimization |
|--------|---------------------|-------------------|
| Toggle 1 checkbox (1000 items) | Re-render all 1000 | Update 1 element |
| Add 1 item | Create 1000 elements | Create 1 element |
| Delete 1 item | Re-create 999 elements | Remove 1 element |

### Per-Item Reactivity

Each todo item's properties are refs, so changes only update specific elements:

```typescript
type TodoItem = {
  id: number;
  text: Ref<string>;        // Only updates text element
  completed: Ref<boolean>;  // Only updates checkbox + className
  priority: Ref<'low' | 'medium' | 'high'>; // Only updates border
}

// Toggling completed ONLY updates the checkbox and text styling
function toggleTodo(id: number) {
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    todo.completed.value = !todo.completed.value; // Surgical update!
  }
}
```

## Memory Management

### Automatic Cleanup

The framework automatically tracks and cleans up subscriptions:

```typescript
// When list items are removed, their subscriptions are cleaned up
ui.List({
  items: todos,
  key: (todo) => todo.id,
  render: (todo, index, ui) => {
    ui.Text({ value: todo.text }); // Subscription auto-cleaned on delete
  }
});

// When conditional content changes, old subscriptions are cleaned
ui.When(condition, (ui) => {
  ui.Text({ value: reactiveValue }); // Cleaned when condition becomes false
});
```

### Manual Cleanup

For custom cleanup scenarios:

```typescript
const builder = new LayoutBuilder();
builder.Text({ value: reactiveRef });

// Later, when component is unmounted
builder.destroy(); // Unsubscribes all refs
```

## API Reference

### State Management

#### `ref<T>(initialValue: T): Ref<T>`
Creates a reactive reference.

#### `watch<T, R>(source, callback): Ref<R> | void`
Watches one or more refs and computes derived values or performs side effects.

### UI Building

#### `Component(fn): HTMLElement`
Creates a component with the builder pattern.

#### `ui.Div(config, builder?)`
Creates a div container with optional nested content.

#### `ui.Button(config)`
Creates a button element.

#### `ui.Text(config)`
Creates a text paragraph element.

#### `ui.Input(config)`
Creates an input element (text, checkbox, etc.).

#### `ui.List<T>(config)`
Renders a reactive list with keyed diffing.

#### `ui.When(condition, thenBuilder).Else(elseBuilder)`
Conditionally renders content based on a boolean ref.

#### `ui.append(component)`
Appends a pre-built component to the layout.

## Best Practices

### 1. Use Stable Keys for Lists

```typescript
// ✅ Good - stable ID
ui.List({
  items: todos,
  key: (todo) => todo.id,
  render: ...
});

// ❌ Bad - index changes on reorder
ui.List({
  items: todos,
  key: (todo, index) => index,
  render: ...
});
```

### 2. Make Item Properties Reactive

```typescript
// ✅ Good - surgical updates
type TodoItem = {
  id: number;
  text: Ref<string>;
  done: Ref<boolean>;
}

// Toggle only updates the specific checkbox
todo.done.value = !todo.done.value;

// ❌ Bad - full re-render
type TodoItem = {
  id: number;
  text: string;
  done: boolean;
}

// Replacing entire array triggers re-render
todos.value = todos.value.map(t => 
  t.id === id ? { ...t, done: !t.done } : t
);
```

### 3. Compose Reusable Components

```typescript
// ✅ Good - reusable component
function TodoItem(todo: TodoItem, actions: TodoActions) {
  return Component((ui) => {
    ui.Div({ className: "todo-item" }, (ui) => {
      ui.Input({ type: "checkbox", checked: todo.done });
      ui.Text({ value: todo.text });
      ui.Button({ text: "Delete", on: { click: () => actions.onDelete(todo.id) } });
    });
  });
}

// Use it
ui.List({
  items: todos,
  render: (todo, index, ui) => {
    ui.append(TodoItem(todo, actions));
  }
});
```

### 4. Use Watch for Derived State

```typescript
// ✅ Good - computed once
const hasItems = watch(items, arr => arr.length > 0);
const activeCount = watch(items, arr => arr.filter(i => !i.done).length);

ui.When(hasItems, (ui) => {
  ui.Text({ value: activeCount, formatter: c => `${c} active` });
});

// ❌ Bad - recalculates on every access
ui.When(items.value.length > 0, ...)  // Not reactive!
```

## Examples

See [`src/main.ts`](src/main.ts) for a complete todo app example with:
- ✅ Add/edit/delete todos
- ✅ Toggle completion
- ✅ Priority levels
- ✅ Filtering (all/active/completed)
- ✅ Statistics
- ✅ Persisted state
- ✅ Beautiful Tailwind UI

## License

MIT
