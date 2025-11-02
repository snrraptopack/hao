# TodoList Implementation Comparison: `ref` vs `createStore`

This document compares two approaches to implementing the TodoList component: using individual `ref` objects vs using `createStore`.

## Current Implementation (Individual `ref` objects)

```tsx
// State management
const todos = ref([
  { id: 1, text: 'Learn Auwla', completed: ref(false) },
  { id: 2, text: 'Build something awesome', completed: ref(false) },
  { id: 3, text: 'Share with the world', completed: ref(true) }
]);

// Toggle operation
const toggleTodo = (id: number) => {
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    todo.completed.value = !todo.completed.value; // ✅ Updates existing ref
  }
};

// JSX with reactive styles
<li style={watch(todo.completed, (completed) => ({
  textDecoration: completed ? 'line-through' : 'none',
  cursor: 'pointer'
}))}>
```

## Alternative Implementation (with `createStore`)

```tsx
// State management
const todoStore = createStore({
  todos: [
    { id: 1, text: 'Learn Auwla', completed: false },
    { id: 2, text: 'Build something awesome', completed: false },
    { id: 3, text: 'Share with the world', completed: true }
  ],
  newTodoText: ''
});

// Toggle operation - Method 1: updateAt
const toggleTodo = (id: number) => {
  todoStore.updateAt(
    state => state.todos,
    todos => todos.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    ),
    (root, updatedTodos) => ({ ...root, todos: updatedTodos })
  );
};

// Toggle operation - Method 2: using branch
const todosStore = todoStore.branch(
  state => state.todos,
  (root, todos) => ({ ...root, todos })
);

const toggleTodoWithBranch = (id: number) => {
  todosStore.update(todos => 
    todos.map(todo => 
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    )
  );
};

// JSX with reactive styles
<li style={watch(todoStore.value, state => {
  const currentTodo = state.todos.find(t => t.id === todo.id);
  return {
    textDecoration: currentTodo?.completed ? 'line-through' : 'none',
    cursor: 'pointer'
  };
})}>
```

## Key Differences

### 1. **State Structure**

| Aspect | Individual `ref` | `createStore` |
|--------|------------------|---------------|
| **Data Shape** | Nested refs: `{ completed: ref(boolean) }` | Plain objects: `{ completed: boolean }` |
| **Reactivity** | Each property is individually reactive | Entire state tree is reactive |
| **Memory** | More ref objects, more subscriptions | Single root ref, structural sharing |

### 2. **Update Patterns**

| Operation | Individual `ref` | `createStore` |
|-----------|------------------|---------------|
| **Toggle Todo** | `todo.completed.value = !todo.completed.value` | `store.updateAt(...)` or `branch.update(...)` |
| **Add Todo** | `todos.value = [...todos.value, newTodo]` | `store.update(prev => ({ ...prev, todos: [...prev.todos, newTodo] }))` |
| **Delete Todo** | `todos.value = todos.value.filter(...)` | `store.updateAt(state => state.todos, todos => todos.filter(...), ...)` |

### 3. **Reactivity in JSX**

| Aspect | Individual `ref` | `createStore` |
|--------|------------------|---------------|
| **Style Binding** | `watch(todo.completed, ...)` | `watch(store.value, state => state.todos.find(...))` |
| **Granularity** | Fine-grained (per property) | Coarse-grained (needs selector) |
| **Performance** | Fewer re-computations | More re-computations but with structural sharing |

### 4. **Advantages & Trade-offs**

#### Individual `ref` Approach
**Advantages:**
- ✅ Fine-grained reactivity (only affected components re-render)
- ✅ Simple, direct updates (`todo.completed.value = !todo.completed.value`)
- ✅ Natural reactive binding in JSX (`watch(todo.completed, ...)`)
- ✅ Less boilerplate for simple operations

**Disadvantages:**
- ❌ More memory overhead (many ref objects)
- ❌ Can lead to scattered state management
- ❌ Harder to implement complex state operations
- ❌ No built-in structural sharing

#### `createStore` Approach
**Advantages:**
- ✅ Centralized state management
- ✅ Structural sharing (performance optimization)
- ✅ Immutable update patterns (predictable state changes)
- ✅ Better for complex state operations
- ✅ Built-in batching and coalescing
- ✅ Type-safe nested updates with `branch()`

**Disadvantages:**
- ❌ More verbose update syntax
- ❌ Requires selectors for fine-grained reactivity
- ❌ Learning curve for immutable patterns
- ❌ Potential over-rendering without careful selectors

## When to Use Which?

### Use Individual `ref` When:
- Simple, flat state structures
- Independent, loosely related pieces of state
- Fine-grained reactivity is crucial
- Minimal boilerplate is preferred
- Component-local state

### Use `createStore` When:
- Complex, nested state structures
- Related data that changes together
- Need for centralized state management
- Performance is critical (large datasets)
- Implementing patterns like undo/redo
- Cross-component state sharing

## Performance Considerations

### Individual `ref`:
```tsx
// Only this specific todo's style updates when its completed status changes
<li style={watch(todo.completed, (completed) => ({
  textDecoration: completed ? 'line-through' : 'none'
}))}>
```

### `createStore`:
```tsx
// Entire store subscription fires, but structural sharing minimizes impact
<li style={watch(todoStore.value, state => {
  const currentTodo = state.todos.find(t => t.id === todo.id);
  return {
    textDecoration: currentTodo?.completed ? 'line-through' : 'none'
  };
})}>
```

## Conclusion

Both approaches are valid and serve different use cases:

- **Individual `ref`** is excellent for simple, component-local state with fine-grained reactivity needs
- **`createStore`** shines for complex, structured state that benefits from centralized management and immutable update patterns

The choice depends on your specific requirements for state complexity, performance characteristics, and developer experience preferences.