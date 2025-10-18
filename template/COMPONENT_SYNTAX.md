# Auwla Component Syntax Specification

## Overview

`.auwla` files use **PascalCase naming convention** to create reactive UI components with JSX syntax.
Functions starting with an uppercase letter are treated as components.

## File Structure

```typescript
<script>
// Imports, types, state, and helpers
import { ref, watch } from 'auwla'

interface Props {
  title: string
  count?: number
}

const state = ref(0)

function helperFunction() {
  // camelCase = helper function
}
</script>

// Component function (PascalCase = component)
function MyComponent({ title, count = 0 }: Props) {
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {state.value + count}</p>
    </div>
  )
}
```

## Key Rules

1. **`<script>` Section**: Contains all imports, interfaces/types, state (refs), and helper functions
2. **Component Function**: Lives **outside** the `<script>` tag
3. **PascalCase Naming**: Functions starting with uppercase are components
4. **camelCase Naming**: Functions starting with lowercase are helpers
5. **TypeScript Support**: Full TypeScript with interfaces, generics, type annotations
6. **JSX Syntax**: Use JSX in component return statements

## Props

Props are function parameters with TypeScript support:

```typescript
<script>
interface TodoItemProps {
  todo: TodoItem
  onToggle: (todo: TodoItem) => void
  readonly?: boolean
}
</script>

function TodoItem({ todo, onToggle, readonly = false }: TodoItemProps) {
  return (
    <li @click={() => !readonly && onToggle(todo)}>
      {todo.text}
    </li>
  )
}
```

## State Management

Use `ref()` for reactive state in the `<script>` section:

```typescript
<script>
import { ref } from 'auwla'

const count = ref(0)
const todos = ref<Todo[]>([])
</script>

function Counter() {
  return (
    <div>
      <button @click={() => count.value++}>
        Count: {count.value}
      </button>
    </div>
  )
}
```

## Directives

### `@if` - Conditional Rendering

```typescript
function TodoList() {
  return (
    <div>
      <p @if={todos.value.length === 0}>No todos yet</p>
      <ul @if={todos.value.length > 0}>
        {/* List items */}
      </ul>
    </div>
  )
}
```

### `@each` - List Rendering

```typescript
function TodoList() {
  return (
    <ul>
      <li @each={todos.value} @key="id">
        {(todo) => (
          <span>{todo.text}</span>
        )}
      </li>
    </ul>
  )
}
```

### `@click` - Event Handlers

```typescript
function Button() {
  return (
    <button @click={() => count.value++}>
      Click me
    </button>
  )
}
```

### `:value` - Two-way Binding

```typescript
function Input() {
  return (
    <input type="text" :value={text} />
  )
}
```

## Complete Example

```typescript
<script>
import { ref, watch } from 'auwla'

interface TodoItem {
  id: number
  text: string
  done: boolean
}

interface Props {
  initialTodos?: TodoItem[]
}

const todos = ref<TodoItem[]>([])
const filter = ref<'all' | 'active' | 'completed'>('all')
const newTodoText = ref('')

function addTodo() {
  if (!newTodoText.value.trim()) return
  
  todos.value = [
    ...todos.value,
    {
      id: Date.now(),
      text: newTodoText.value,
      done: false
    }
  ]
  newTodoText.value = ''
}

function toggleTodo(id: number) {
  todos.value = todos.value.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo
  )
}

// Computed filtered list
const filteredTodos = ref<TodoItem[]>([])
watch([todos, filter], ([todos, filter]) => {
  filteredTodos.value = todos.filter(todo => {
    if (filter === 'active') return !todo.done
    if (filter === 'completed') return todo.done
    return true
  })
})
</script>

function TodoApp({ initialTodos = [] }: Props) {
  return (
    <div class="todo-app">
      <h1>Todo List</h1>
      
      <div class="input-section">
        <input 
          type="text" 
          :value={newTodoText}
          placeholder="What needs to be done?"
        />
        <button @click={addTodo}>Add</button>
      </div>
      
      <div class="filters">
        <button 
          @click={() => filter.value = 'all'}
          class={filter.value === 'all' ? 'active' : ''}
        >
          All
        </button>
        <button 
          @click={() => filter.value = 'active'}
          class={filter.value === 'active' ? 'active' : ''}
        >
          Active
        </button>
        <button 
          @click={() => filter.value = 'completed'}
          class={filter.value === 'completed' ? 'active' : ''}
        >
          Completed
        </button>
      </div>
      
      <ul class="todo-list">
        <li @each={filteredTodos.value} @key="id">
          {(todo: TodoItem) => (
            <div class={`todo-item ${todo.done ? 'done' : ''}`}>
              <input 
                type="checkbox" 
                checked={todo.done}
                @click={() => toggleTodo(todo.id)}
              />
              <span>{todo.text}</span>
            </div>
          )}
        </li>
      </ul>
      
      <p @if={filteredTodos.value.length === 0}>
        No todos to show
      </p>
    </div>
  )
}
```

## Compilation Target

`.auwla` files compile to the Auwla DSL:

```typescript
// Input: Hello.auwla
<script>
import { ref } from 'auwla'
const greeting = ref('Hello')
</script>

function Hello({ name }: Props) {
  return <div><h1>{greeting.value}, {name}!</h1></div>
}

// Output: Hello.auwla.compiled.js
import { Component, ref } from 'auwla'

const greeting = ref('Hello')

export default Component((ui) => {
  ui.Div((ui) => {
    ui.H1((ui) => {
      ui.Text(() => `${greeting.value}, ${ui.props.name}!`)
    })
  })
})
```

## Migration from HTML Templates

**Old `.html` syntax:**
```html
<script>
import { ref, if as If, each as Each } from 'auwla/template'
const count = ref(0)
</script>

<div>
  <button @click="() => count.value++">
    Click me: ${count.value}
  </button>
</div>
```

**New `.auwla` syntax:**
```typescript
<script>
import { ref } from 'auwla'
const count = ref(0)
</script>

function Counter() {
  return (
    <button @click={() => count.value++}>
      Click me: {count.value}
    </button>
  )
}
```

### Key Differences:
- ✅ Component function with JSX instead of template strings
- ✅ No need to import `if` and `each` helpers
- ✅ Use `{}` for expressions instead of `${}`
- ✅ Full TypeScript support with interfaces
- ✅ Better IDE support (autocomplete, type checking)
