# 🚀 Intermediate Guide - Computed Values & Lists

## Computed Values with watch()

Sometimes you need a value that's calculated from other reactive values. This is where `watch()` comes in.

### Basic Computed Value

```typescript
import { ref, watch } from "./state"

const firstName = ref("John")
const lastName = ref("Doe")

// Computed full name
const fullName = watch([firstName, lastName], ([first, last]) => {
  return `${first} ${last}`
})

console.log(fullName.value) // "John Doe"

firstName.value = "Jane"
console.log(fullName.value) // "Jane Doe" - automatically updated!
```

**How it works:**
1. `watch()` takes sources (refs to watch) and a callback
2. When any source changes, the callback runs
3. The callback's return value becomes the new computed value
4. You get back a new `ref` that updates automatically

### Single Source Watch

```typescript
const count = ref(0)

// Computed: double the count
const doubled = watch(count, (value) => value * 2)

console.log(doubled.value) // 0
count.value = 5
console.log(doubled.value) // 10
```

### Type Assertions (Important!)

Because `watch()` can return either `void` (for side effects) or `Ref<T>` (for computed values), TypeScript sometimes needs help:

```typescript
const isEven = watch(count, (v) => v % 2 === 0) as Ref<boolean>

// Now TypeScript knows isEven is Ref<boolean>
ui.When(isEven, (ui) => {
  ui.Text({ value: "Count is even!" })
})
```

## Conditional Rendering

### When/Else Pattern

```typescript
const isLoggedIn = ref(false)

Component((ui) => {
  ui.When(isLoggedIn, (ui) => {
    ui.Text({ value: "Welcome back!" })
    ui.Button({ 
      text: "Logout",
      on: { click: () => isLoggedIn.value = false }
    })
  }).Else((ui) => {
    ui.Text({ value: "Please login" })
    ui.Button({ 
      text: "Login",
      on: { click: () => isLoggedIn.value = true }
    })
  })
})
```

### Computed Conditions

```typescript
const age = ref(15)
const canVote = watch(age, (v) => v >= 18) as Ref<boolean>

ui.When(canVote, (ui) => {
  ui.Text({ value: "✅ You can vote!" })
}).Else((ui) => {
  ui.Text({ value: "❌ Too young to vote" })
})
```

## Rendering Lists

### Basic List

```typescript
type Todo = {
  id: number
  text: string
  completed: boolean
}

const todos = ref<Todo[]>([
  { id: 1, text: "Learn framework", completed: false },
  { id: 2, text: "Build app", completed: false }
])

Component((ui) => {
  ui.List({
    items: todos,
    key: (todo) => todo.id,  // Unique key for each item
    render: (todo, index, ui) => {
      ui.Div({ className: "border p-4" }, (ui) => {
        ui.Text({ value: todo.text })
      })
    }
  })
})
```

### Why Keys Matter

Keys help the framework know which items changed, were added, or removed. This makes updates **much faster**.

```typescript
// ❌ Without keys - recreates all items on change
ui.List({
  items: todos,
  render: (todo, i, ui) => { /* ... */ }
})

// ✅ With keys - only updates changed items
ui.List({
  items: todos,
  key: (todo) => todo.id,  // Unique identifier
  render: (todo, i, ui) => { /* ... */ }
})
```

## Per-Item Reactivity (Advanced Pattern)

For maximum performance, make each item's properties reactive:

```typescript
type TodoItem = {
  id: number
  text: Ref<string>           // Reactive!
  completed: Ref<boolean>     // Reactive!
}

const todos = ref<TodoItem[]>([
  { 
    id: 1, 
    text: ref("Learn framework"), 
    completed: ref(false) 
  }
])

// Toggle a single todo - only that item re-renders!
function toggleTodo(id: number) {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    todo.completed.value = !todo.completed.value  // Surgical update!
  }
}

Component((ui) => {
  ui.List({
    items: todos,
    key: (todo) => todo.id,
    render: (todo, index, ui) => {
      ui.Div({ className: "flex items-center gap-2" }, (ui) => {
        // Reactive checkbox
        ui.Input({
          type: "checkbox",
          checked: todo.completed,  // Binds to ref
          on: {
            change: () => todo.completed.value = !todo.completed.value
          }
        })
        
        // Text updates when todo.text changes
        ui.Text({ 
          value: todo.text,
          className: watch(todo.completed, (done) => 
            done ? "line-through text-gray-400" : ""
          ) as Ref<string>
        })
      })
    }
  })
})
```

## Practical Example: Shopping Cart

```typescript
import { Component } from "./dsl"
import { ref, watch } from "./state"

type Product = {
  id: number
  name: string
  price: number
  quantity: Ref<number>  // Reactive quantity!
}

const cart = ref<Product[]>([
  { id: 1, name: "Laptop", price: 999, quantity: ref(1) },
  { id: 2, name: "Mouse", price: 49, quantity: ref(2) }
])

// Computed total
const total = watch(cart, (items) => {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity.value)
  }, 0)
}) as Ref<number>

const CartApp = Component((ui) => {
  ui.Div({ className: "p-8" }, (ui) => {
    ui.Text({ 
      value: "Shopping Cart", 
      className: "text-3xl font-bold mb-6" 
    })
    
    // Product list
    ui.List({
      items: cart,
      key: (product) => product.id,
      className: "space-y-4",
      render: (product, i, ui) => {
        ui.Div({ className: "flex items-center justify-between border p-4 rounded" }, (ui) => {
          ui.Text({ 
            value: product.name,
            className: "font-semibold" 
          })
          
          // Quantity controls
          ui.Div({ className: "flex items-center gap-2" }, (ui) => {
            ui.Button({
              text: "−",
              on: { 
                click: () => product.quantity.value = Math.max(0, product.quantity.value - 1)
              },
              className: "px-3 py-1 bg-red-500 text-white rounded"
            })
            
            ui.Text({
              value: product.quantity,
              formatter: (q) => String(q),
              className: "w-8 text-center"
            })
            
            ui.Button({
              text: "+",
              on: { 
                click: () => product.quantity.value++
              },
              className: "px-3 py-1 bg-green-500 text-white rounded"
            })
          })
          
          // Item total
          ui.Text({
            value: product.quantity,
            formatter: (qty) => `$${(product.price * qty).toFixed(2)}`,
            className: "font-bold text-lg"
          })
        })
      }
    })
    
    // Cart total
    ui.Div({ className: "mt-8 border-t pt-4" }, (ui) => {
      ui.Div({ className: "flex justify-between items-center" }, (ui) => {
        ui.Text({ 
          value: "Total:", 
          className: "text-2xl font-bold" 
        })
        ui.Text({
          value: total,
          formatter: (t) => `$${t.toFixed(2)}`,
          className: "text-3xl font-bold text-green-600"
        })
      })
    })
  })
})
```

## Component Composition

Break your UI into reusable pieces:

```typescript
// Reusable button component
function PrimaryButton(text: string, onClick: () => void) {
  return Component((ui) => {
    ui.Button({
      text,
      on: { click: onClick },
      className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    })
  })
}

// Use it
const App = Component((ui) => {
  ui.Div({ className: "flex gap-4" }, (ui) => {
    ui.append(PrimaryButton("Save", () => console.log("Saved")))
    ui.append(PrimaryButton("Cancel", () => console.log("Cancelled")))
  })
})
```

### Component with Props

```typescript
function ProductCard(product: { name: string; price: number }) {
  return Component((ui) => {
    ui.Div({ className: "border rounded-lg p-6" }, (ui) => {
      ui.Text({ 
        value: product.name, 
        className: "text-xl font-bold mb-2" 
      })
      ui.Text({ 
        value: `$${product.price}`, 
        className: "text-2xl text-green-600" 
      })
    })
  })
}

// Use it
ui.append(ProductCard({ name: "Laptop", price: 999 }))
ui.append(ProductCard({ name: "Mouse", price: 49 }))
```

## Lifecycle Hooks

Sometimes you need to run code when a component mounts or unmounts.

### onMount - Run Code When Component Appears

```typescript
import { onMount } from "./lifecycle"

Component((ui) => {
  onMount(() => {
    console.log("Component mounted!")
    
    // Fetch data
    fetch('/api/data')
      .then(res => res.json())
      .then(data => myRef.value = data)
  })
  
  ui.Text({ value: "Hello" })
})
```

### Cleanup on Unmount

```typescript
Component((ui) => {
  onMount(() => {
    console.log("Component mounted!")
    
    // Setup interval
    const interval = setInterval(() => {
      console.log("Tick")
    }, 1000)
    
    // Return cleanup function
    return () => {
      console.log("Component unmounting, cleaning up...")
      clearInterval(interval)
    }
  })
})
```

## Built-in Fetch Helper

The framework includes a fetch helper with loading/error states:

```typescript
import { fetch as fetchData } from "./fetch"

type User = { id: number; name: string; email: string }

Component((ui) => {
  // Auto-fetches on mount
  const { data, loading, error } = fetchData<User[]>('/api/users')
  
  ui.When(loading, (ui) => {
    ui.Text({ value: "Loading..." })
  })
  
  ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => {
    ui.Text({ 
      value: error,
      formatter: (e) => `Error: ${e}`,
      className: "text-red-500"
    })
  })
  
  ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
    ui.List({
      items: data as Ref<User[]>,
      key: (user) => user.id,
      render: (user, i, ui) => {
        ui.Text({ value: user.name })
      }
    })
  })
})
```

## Key Takeaways

✅ **watch()** creates computed values from other refs  
✅ **When/Else** for conditional rendering  
✅ **List()** with keys for efficient list rendering  
✅ **Per-item reactivity** for surgical updates  
✅ **Component composition** with `.append()`  
✅ **onMount/onUnmount** for lifecycle management  
✅ **Built-in fetch** for async data loading  

## Next Steps

👉 Continue to [Advanced Guide](./03-advanced.md) to learn:
- Router and SPA navigation
- State caching and persistence
- Performance optimization
- Advanced patterns
