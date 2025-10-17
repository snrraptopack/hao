# 🔥 Advanced Guide - Router & Performance

## SPA Router

The framework includes a full-featured SPA router with:
- Dynamic routes (`/products/:id`)
- Query parameters
- Route guards
- State caching
- Navigation components

### Basic Setup

```typescript
import { Router } from "./router"

const router = new Router()

// Define routes
router.addRoute("/", HomePage)
router.addRoute("/products", ProductsPage)
router.addRoute("/products/:id", ProductDetailPage)

// Start the router
router.start()

// Mount app
document.querySelector("#app")!.appendChild(router.render())
```

### Route Components

Each route is just a component:

```typescript
function HomePage() {
  return Component((ui) => {
    ui.Div({ className: "p-8" }, (ui) => {
      ui.Text({ 
        value: "Welcome Home!", 
        className: "text-4xl font-bold" 
      })
    })
  })
}
```

### Dynamic Routes

Capture URL parameters:

```typescript
import { useParams } from "./router"

function ProductDetailPage() {
  return Component((ui) => {
    const params = useParams()  // { id: "123" }
    
    ui.Text({ 
      value: params,
      formatter: (p) => `Product ID: ${p.id}`,
      className: "text-2xl"
    })
  })
}

// Navigate to: /products/123
// params = { id: "123" }
```

### Query Parameters

```typescript
import { useQuery } from "./router"

function SearchPage() {
  return Component((ui) => {
    const query = useQuery()  // { q: "laptop", sort: "price" }
    
    ui.Text({ 
      value: query,
      formatter: (q) => `Search: ${q.q}, Sort: ${q.sort}`,
      className: "text-xl"
    })
  })
}

// Navigate to: /search?q=laptop&sort=price
// query = { q: "laptop", sort: "price" }
```

## Navigation

### Link Component

```typescript
import { Link } from "./router"

Component((ui) => {
  // Basic link
  ui.append(Link("/products", "View Products"))
  
  // Link with active state
  ui.append(Link("/about", "About", {
    activeClass: "font-bold text-blue-600",
    inactiveClass: "text-gray-600"
  }))
})
```

### Programmatic Navigation

```typescript
import { useRouter } from "./router"

Component((ui) => {
  const router = useRouter()
  
  ui.Button({
    text: "Go to Products",
    on: {
      click: () => router.push("/products")
    }
  })
  
  ui.Button({
    text: "Go Back",
    on: {
      click: () => router.back()
    }
  })
})
```

### Navigation Methods

```typescript
const router = useRouter()

// Push new history entry
router.push("/products")

// Replace current entry
router.replace("/products")

// Browser back/forward
router.back()
router.forward()

// Named route navigation
router.pushNamed("/products/:id", { id: "123" })
```

## Route Guards

Protect routes with async validation:

```typescript
const isAuthenticated = ref(false)

// Guard function
async function authGuard(to: string, from: string) {
  if (!isAuthenticated.value) {
    console.log("Not authenticated, redirecting...")
    return false  // Block navigation
  }
  return true  // Allow navigation
}

// Apply guard
router.addRoute("/dashboard", DashboardPage, authGuard)
router.addRoute("/profile", ProfilePage, authGuard)
```

### Multiple Guards

```typescript
async function checkPermissions(to: string, from: string) {
  const user = await fetchCurrentUser()
  return user.role === "admin"
}

async function checkSubscription(to: string, from: string) {
  const sub = await fetchSubscription()
  return sub.active
}

// Both guards must pass
router.addRoute("/admin", AdminPage, async (to, from) => {
  const hasPermissions = await checkPermissions(to, from)
  const hasSubscription = await checkSubscription(to, from)
  return hasPermissions && hasSubscription
})
```

## State Caching

The router includes a `state` object for caching data across navigations.

### Basic Caching with Fetch

```typescript
import { fetch as fetchData } from "./fetch"

type Comment = { id: number; text: string }

function CommentsPage() {
  return Component((ui) => {
    // Auto-caches with key "comments"
    const { data, loading } = fetchData<Comment[]>(
      '/api/comments',
      { cacheKey: 'comments' }
    )
    
    ui.When(loading, (ui) => {
      ui.Text({ value: "Loading comments..." })
    })
    
    ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
      ui.List({
        items: data as Ref<Comment[]>,
        key: (c) => c.id,
        render: (comment, i, ui) => {
          ui.Text({ value: comment.text })
        }
      })
    })
  })
}
```

**How it works:**
1. First visit: Fetches data, stores in `router.state.comments`
2. Navigate away
3. Return to page: Uses cached data (no fetch!)

### Manual Cache Access

```typescript
import { useRouter } from "./router"

Component((ui) => {
  const router = useRouter()
  
  // Read cache
  const cachedData = router.state.myData
  
  // Write cache
  router.state.myData = { user: "Alice" }
  
  // Clear specific key
  router.clearCacheKey('myData')
  
  // Clear all cache
  router.clearCache()
})
```

### Cache Strategy

```typescript
type Product = { id: number; name: string; price: number }

function ProductsPage() {
  return Component((ui) => {
    const router = useRouter()
    
    const { data, loading, refetch } = fetchData<Product[]>(
      '/api/products',
      { cacheKey: 'products' }
    )
    
    ui.Button({
      text: "Refresh Products",
      on: {
        click: () => {
          router.clearCacheKey('products')  // Clear cache
          refetch()  // Fetch fresh data
        }
      }
    })
    
    ui.List({
      items: data as Ref<Product[]>,
      key: (p) => p.id,
      render: (product, i, ui) => {
        ui.Text({ value: product.name })
      }
    })
  })
}
```

## Performance Optimization

### 1. Keyed Lists

Always use keys for lists to minimize DOM operations:

```typescript
// ❌ Slow - recreates all items
ui.List({
  items: products,
  render: (p, i, ui) => { /* ... */ }
})

// ✅ Fast - surgical updates only
ui.List({
  items: products,
  key: (p) => p.id,
  render: (p, i, ui) => { /* ... */ }
})
```

### 2. Per-Item Reactivity

Make individual properties reactive instead of the whole object:

```typescript
type Todo = {
  id: number
  text: Ref<string>         // ✅ Reactive
  completed: Ref<boolean>   // ✅ Reactive
}

// Only the changed todo re-renders
function toggleTodo(id: number) {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    todo.completed.value = !todo.completed.value  // Surgical!
  }
}
```

### 3. Computed Values

Cache expensive calculations:

```typescript
const products = ref<Product[]>([...])

// ❌ Recalculates on every access
function getExpensiveProducts() {
  return products.value.filter(p => p.price > 1000)
}

// ✅ Only recalculates when products change
const expensiveProducts = watch(products, (items) => {
  return items.filter(p => p.price > 1000)
}) as Ref<Product[]>
```

### 4. Debouncing

Limit expensive operations:

```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: number
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const searchQuery = ref("")
const searchResults = ref<Product[]>([])

const debouncedSearch = debounce(async (query: string) => {
  const res = await fetch(`/api/search?q=${query}`)
  searchResults.value = await res.json()
}, 300)  // Wait 300ms after last keystroke

Component((ui) => {
  ui.Input({
    value: searchQuery,
    on: {
      input: (e) => {
        searchQuery.value = (e.target as HTMLInputElement).value
        debouncedSearch(searchQuery.value)
      }
    }
  })
})
```

### 5. Lazy Loading

Load components only when needed:

```typescript
const showHeavyComponent = ref(false)

Component((ui) => {
  ui.Button({
    text: "Load Component",
    on: { 
      click: () => showHeavyComponent.value = true 
    }
  })
  
  ui.When(showHeavyComponent, (ui) => {
    // Only renders when showHeavyComponent is true
    ui.append(HeavyDataTable())
  })
})
```

## Memory Management

The framework automatically cleans up subscriptions and event listeners.

### How Cleanup Works

```typescript
Component((ui) => {
  const count = ref(0)
  
  // Subscription is auto-cleaned when component unmounts
  count.subscribe((val) => {
    console.log("Count:", val)
  })
  
  // Event listener is auto-cleaned
  ui.Button({
    text: "Click",
    on: { click: () => count.value++ }
  })
})
```

### Manual Cleanup

```typescript
import { onUnmount } from "./lifecycle"

Component((ui) => {
  const ws = new WebSocket('ws://localhost:8080')
  
  onUnmount(() => {
    console.log("Closing WebSocket...")
    ws.close()
  })
  
  ui.Text({ value: "Connected to WebSocket" })
})
```

### Cleanup Pattern

```typescript
Component((ui) => {
  onMount(() => {
    // Setup
    const interval = setInterval(() => {
      console.log("Tick")
    }, 1000)
    
    const subscription = myRef.subscribe((val) => {
      console.log("Value:", val)
    })
    
    // Cleanup function
    return () => {
      clearInterval(interval)
      subscription()  // Unsubscribe
      console.log("Cleaned up!")
    }
  })
})
```

## Advanced Patterns

### Custom Hooks

Create reusable logic:

```typescript
function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initialValue
  
  return { count, increment, decrement, reset }
}

// Use it
Component((ui) => {
  const { count, increment, decrement } = useCounter(10)
  
  ui.Text({ 
    value: count,
    formatter: (c) => `Count: ${c}`
  })
  
  ui.Button({ text: "+", on: { click: increment } })
  ui.Button({ text: "-", on: { click: decrement } })
})
```

### Form Handling

```typescript
function useForm<T>(initialValues: T) {
  const values = ref(initialValues)
  const errors = ref<Partial<Record<keyof T, string>>>({})
  
  function setField<K extends keyof T>(key: K, value: T[K]) {
    values.value = { ...values.value, [key]: value }
  }
  
  function validate(rules: Partial<Record<keyof T, (val: any) => string | null>>) {
    const newErrors: any = {}
    
    for (const key in rules) {
      const error = rules[key]!(values.value[key])
      if (error) newErrors[key] = error
    }
    
    errors.value = newErrors
    return Object.keys(newErrors).length === 0
  }
  
  return { values, errors, setField, validate }
}

// Use it
Component((ui) => {
  const form = useForm({ email: "", password: "" })
  
  ui.Input({
    type: "email",
    value: watch(form.values, v => v.email) as Ref<string>,
    on: {
      input: (e) => form.setField("email", (e.target as HTMLInputElement).value)
    }
  })
  
  ui.Button({
    text: "Submit",
    on: {
      click: () => {
        const isValid = form.validate({
          email: (v) => !v.includes('@') ? "Invalid email" : null,
          password: (v) => v.length < 6 ? "Too short" : null
        })
        
        if (isValid) {
          console.log("Submit:", form.values.value)
        }
      }
    }
  })
})
```

### Async Component Loading

```typescript
function AsyncComponent(loader: () => Promise<() => HTMLElement>) {
  const loaded = ref<(() => HTMLElement) | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  
  onMount(async () => {
    try {
      const component = await loader()
      loaded.value = component
      loading.value = false
    } catch (e) {
      error.value = (e as Error).message
      loading.value = false
    }
  })
  
  return Component((ui) => {
    ui.When(loading, (ui) => {
      ui.Text({ value: "Loading component..." })
    })
    
    ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => {
      ui.Text({ 
        value: error,
        formatter: (e) => `Error: ${e}`,
        className: "text-red-500"
      })
    })
    
    ui.When(watch(loaded, l => l !== null) as Ref<boolean>, (ui) => {
      ui.append(loaded.value!())
    })
  })
}

// Use it
const HeavyComponent = AsyncComponent(async () => {
  // Simulate slow load
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  return () => Component((ui) => {
    ui.Text({ value: "Heavy component loaded!" })
  })
})
```

## Real-World Example: Blog App

```typescript
import { Router, Link, useParams } from "./router"
import { fetch as fetchData } from "./fetch"
import { Component } from "./dsl"
import { ref } from "./state"

type Post = { id: number; title: string; body: string }

// List all posts
function BlogIndex() {
  return Component((ui) => {
    const { data, loading } = fetchData<Post[]>(
      '/api/posts',
      { cacheKey: 'posts' }
    )
    
    ui.Div({ className: "p-8" }, (ui) => {
      ui.Text({ value: "Blog Posts", className: "text-4xl font-bold mb-6" })
      
      ui.When(loading, (ui) => {
        ui.Text({ value: "Loading posts..." })
      })
      
      ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
        ui.List({
          items: data as Ref<Post[]>,
          key: (post) => post.id,
          className: "space-y-4",
          render: (post, i, ui) => {
            ui.Div({ className: "border rounded p-4" }, (ui) => {
              ui.append(
                Link(`/posts/${post.id}`, post.title, {
                  className: "text-xl font-bold text-blue-600 hover:underline"
                })
              )
            })
          }
        })
      })
    })
  })
}

// Single post detail
function PostDetail() {
  return Component((ui) => {
    const params = useParams()
    
    const { data, loading, error } = fetchData<Post>(
      `/api/posts/${params.id}`,
      { cacheKey: `post-${params.id}` }
    )
    
    ui.Div({ className: "p-8" }, (ui) => {
      ui.append(Link("/", "← Back to posts", { className: "text-blue-600" }))
      
      ui.When(loading, (ui) => {
        ui.Text({ value: "Loading post..." })
      })
      
      ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
        ui.Text({ 
          value: data as Ref<Post>,
          formatter: (p) => p.title,
          className: "text-4xl font-bold my-6"
        })
        
        ui.Text({
          value: data as Ref<Post>,
          formatter: (p) => p.body,
          className: "text-lg text-gray-700"
        })
      })
    })
  })
}

// Setup router
const router = new Router()
router.addRoute("/", BlogIndex)
router.addRoute("/posts/:id", PostDetail)
router.start()

document.querySelector("#app")!.appendChild(router.render())
```

## Key Takeaways

✅ **Router** - SPA with dynamic routes, guards, and state  
✅ **Navigation** - Link component and programmatic methods  
✅ **State Caching** - `router.state` for cross-navigation persistence  
✅ **Performance** - Keys, per-item reactivity, computed values, debouncing  
✅ **Memory** - Auto cleanup of subscriptions and events  
✅ **Patterns** - Custom hooks, forms, async loading  

## Next Steps

👉 Check out [API Reference](./04-api-reference.md) for complete documentation of all functions and types.
