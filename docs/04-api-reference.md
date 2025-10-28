# 📚 API Reference

Complete reference for all framework functions and types.

---

## State Management

### `ref<T>(initialValue: T): Ref<T>`

Creates a reactive reference.

```typescript
const count = ref(0)
const user = ref({ name: "Alice", age: 30 })
const items = ref<string[]>([])
```

**Returns:** `Ref<T>` with:
- `.value` - Get/set the value
- `.subscribe(callback)` - Subscribe to changes (returns unsubscribe function)

**Example:**
```typescript
const count = ref(10)

// Read value
console.log(count.value)  // 10

// Update value
count.value = 20

// Subscribe to changes
const unsubscribe = count.subscribe((newValue) => {
  console.log("Count changed:", newValue)
})

// Unsubscribe
unsubscribe()
```

---

### `watch(sources, callback): Ref<R> | void`

Creates computed values or side effects from reactive sources.

**Overloads:**

#### Single Source (Computed)
```typescript
watch<T, R>(
  source: Ref<T>,
  callback: (value: T) => R
): Ref<R>
```

**Example:**
```typescript
const count = ref(5)
const doubled = watch(count, (v) => v * 2)

console.log(doubled.value)  // 10
count.value = 10
console.log(doubled.value)  // 20
```

#### Multiple Sources (Computed)
```typescript
watch<T extends any[], R>(
  sources: [...Ref<T[number]>[]],
  callback: (values: T) => R
): Ref<R>
```

**Example:**
```typescript
const first = ref("John")
const last = ref("Doe")
const fullName = watch([first, last], ([f, l]) => `${f} ${l}`)

console.log(fullName.value)  // "John Doe"
```

#### Side Effects Only
```typescript
watch<T>(
  sources: Ref<T> | Ref<any>[],
  callback: (value: T | any[]) => void
): void
```

**Example:**
```typescript
watch(count, (value) => {
  console.log("Count is now:", value)
  // No return value = side effect only
})
```

**Type Assertions:**

When TypeScript can't infer the return type, use `as`:

```typescript
const isEven = watch(count, (v) => v % 2 === 0) as Ref<boolean>
```

---

### `flushSync(): void`

Immediately drains all pending reactive updates in the current tick. Use this when you need state changes to reflect in the DOM synchronously, without waiting for the scheduler.

```typescript
import { ref, watch, flushSync } from './src/state'

const count = ref(0)
count.value = 1
flushSync() // DOM reflects the change immediately
```

**When to use:**
- Imperative UI updates that must be visible right away (e.g., toggling classes before measuring sizes)
- Testing scenarios that require deterministic timing

---

### `flush(): Promise<void>`

Asynchronously waits for the scheduler’s microtask to run and the next animation frame, ensuring the browser has committed DOM updates, layout, and paint. Ideal for benchmarks and flows where you want to measure or sequence after the UI actually updates.

```typescript
import { ref, flush } from './src/state'

const items = ref<string[]>([])

// Create phase
items.value = Array.from({ length: 1_000 }, (_, i) => `Item ${i}`)
await flush() // measure after DOM & paint commit

// Update phase
items.value = items.value.map((s, i) => (i % 2 === 0 ? `${s}*` : s))
await flush() // measure update after commit
```

**When to use:**
- Benchmarks: measure create/update/reorder after the browser commits
- Orchestrating multi-step UI flows that depend on the previous step rendering fully

**Notes:**
- `flush()` combines a microtask turn and `requestAnimationFrame`, so it resolves on the next frame after queued updates are processed.
- Prefer `flushSync()` for immediate, same-tick visibility; prefer `flush()` when you care about post-paint timing.

---

## UI Building

### `Component(fn: (ui: LayoutBuilder) => void): HTMLElement`

Creates a component with lifecycle support.

```typescript
const MyComponent = Component((ui) => {
  ui.Text({ value: "Hello World" })
})

document.body.appendChild(MyComponent)
```

**Returns:** `HTMLElement` with `__cleanup` property for cleanup functions.

---

### LayoutBuilder Methods

#### `Div(props, children?): this`

Creates a `<div>` element.

```typescript
ui.Div({ className: "container" }, (ui) => {
  ui.Text({ value: "Inside div" })
})
```

**Props:**
```typescript
{
  className?: string | Ref<string>
  id?: string
  style?: Record<string, string>
  on?: { [event: string]: (e: Event) => void }
}
```

---

#### `Text(props): this`

Creates a text node.

```typescript
// Static text
ui.Text({ value: "Hello" })

// Reactive text
const name = ref("Alice")
ui.Text({ value: name })

// Formatted text
ui.Text({ 
  value: count,
  formatter: (c) => `Count: ${c}`,
  className: "text-xl"
})
```

**Props:**
```typescript
{
  value: string | Ref<any>
  formatter?: (value: any) => string
  className?: string | Ref<string>
  style?: Record<string, string>
}
```

---

#### `Button(props): this`

Creates a `<button>` element.

```typescript
ui.Button({
  text: "Click me",
  on: { click: () => console.log("Clicked!") },
  className: "px-4 py-2 bg-blue-500 text-white rounded"
})
```

**Props:**
```typescript
{
  text: string | Ref<string>
  on?: { [event: string]: (e: Event) => void }
  className?: string | Ref<string>
  disabled?: boolean | Ref<boolean>
  type?: "button" | "submit" | "reset"
}
```

---

#### `Input(props): this`

Creates an `<input>` element.

```typescript
const email = ref("")

ui.Input({
  type: "email",
  value: email,
  placeholder: "Enter email",
  on: {
    input: (e) => {
      email.value = (e.target as HTMLInputElement).value
    }
  }
})
```

**Props:**
```typescript
{
  type?: "text" | "email" | "password" | "number" | "checkbox" | "radio"
  value?: Ref<string | boolean>
  checked?: Ref<boolean>
  placeholder?: string
  className?: string | Ref<string>
  disabled?: boolean | Ref<boolean>
  on?: { [event: string]: (e: Event) => void }
}
```

---

#### `List<T>(props): this`

Renders a list of items with efficient updates.

```typescript
type User = { id: number; name: string }
const users = ref<User[]>([
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
])

ui.List({
  items: users,
  key: (user) => user.id,  // Required for efficiency
  className: "space-y-2",
  render: (user, index, ui) => {
    ui.Text({ value: user.name })
  }
})
```

**Props:**
```typescript
{
  items: Ref<T[]>
  key?: (item: T) => string | number  // Highly recommended
  className?: string
  render: (item: T, index: number, ui: LayoutBuilder) => void
}
```

**Key Benefits:**
- With `key`: O(1) updates for changed items
- Without `key`: O(n) recreation of all items

---

#### `When(condition, then).Else(otherwise): this`

Conditional rendering.

```typescript
const isLoggedIn = ref(false)

ui.When(isLoggedIn, (ui) => {
  ui.Text({ value: "Welcome back!" })
}).Else((ui) => {
  ui.Text({ value: "Please login" })
})
```

**Params:**
- `condition: Ref<boolean>` - Reactive boolean
- `then: (ui: LayoutBuilder) => void` - Render when true
- `otherwise: (ui: LayoutBuilder) => void` - Render when false (optional)

---

#### `append(element): this`

Appends an existing element.

```typescript
const child = Component((ui) => {
  ui.Text({ value: "Child component" })
})

ui.Div({ className: "container" }, (ui) => {
  ui.append(child)
})
```

---

## Lifecycle

### `onMount(callback: () => void | (() => void)): void`

Runs code when component mounts. Optionally return cleanup function.

```typescript
Component((ui) => {
  onMount(() => {
    console.log("Component mounted!")
    
    const interval = setInterval(() => {
      console.log("Tick")
    }, 1000)
    
    // Cleanup
    return () => {
      clearInterval(interval)
      console.log("Cleaned up!")
    }
  })
  
  ui.Text({ value: "Hello" })
})
```

---

### `onUnmount(callback: () => void): void`

Runs code when component unmounts.

```typescript
Component((ui) => {
  const ws = new WebSocket('ws://localhost:8080')
  
  onUnmount(() => {
    ws.close()
    console.log("WebSocket closed")
  })
})
```

---

## Data Fetching

### `fetch<T>(url: string, options?): FetchResult<T>`

Fetches data with loading/error states and optional caching.

```typescript
type User = { id: number; name: string }

Component((ui) => {
  const { data, loading, error, refetch } = fetch<User[]>(
    '/api/users',
    { cacheKey: 'users' }  // Optional caching
  )
  
  ui.When(loading, (ui) => {
    ui.Text({ value: "Loading..." })
  })
  
  ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => {
    ui.Text({ value: error, formatter: (e) => `Error: ${e}` })
  })
  
  ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
    ui.List({
      items: data as Ref<User[]>,
      key: (u) => u.id,
      render: (user, i, ui) => {
        ui.Text({ value: user.name })
      }
    })
  })
})
```

**Options:**
```typescript
{
  cacheKey?: string  // If provided, caches in router.state[cacheKey]
}
```

**Returns:**
```typescript
{
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  refetch: () => Promise<void>
}
```

**Cache Behavior:**
- First call: Fetches and stores in `router.state[cacheKey]`
- Subsequent calls: Uses cached data (no fetch)
- Call `refetch()` to force fresh fetch
- Call `router.clearCacheKey(key)` to invalidate cache

---

## Router

### `new Router()`

Creates an SPA router.

```typescript
import { Router } from "./router"

const router = new Router()
router.addRoute("/", HomePage)
router.addRoute("/products/:id", ProductDetail)
router.start()

document.querySelector("#app")!.appendChild(router.render())
```

---

### Router Methods

#### `addRoute(path: string, component: () => HTMLElement, guard?: RouteGuard): void`

Adds a route.

```typescript
// Basic route
router.addRoute("/", HomePage)

// Dynamic route
router.addRoute("/users/:id", UserDetail)

// With guard
router.addRoute("/admin", AdminPage, async (to, from) => {
  const isAdmin = await checkAdminStatus()
  return isAdmin  // true = allow, false = block
})
```

---

#### `start(): void`

Starts the router (listens to navigation events).

```typescript
router.start()
```

---

#### `push(path: string): void`

Navigate to a new page.

```typescript
router.push("/products")
router.push("/products/123")
router.push("/search?q=laptop")
```

---

#### `replace(path: string): void`

Replace current page (no history entry).

```typescript
router.replace("/login")
```

---

#### `back(): void` / `forward(): void`

Browser back/forward navigation.

```typescript
router.back()
router.forward()
```

---

#### `pushNamed(path: string, params: Record<string, string>): void`

Navigate with named parameters.

```typescript
router.pushNamed("/users/:id", { id: "123" })
// Navigates to: /users/123
```

---

#### `clearCache(): void`

Clear all cached state.

```typescript
router.clearCache()
```

---

#### `clearCacheKey(key: string): void`

Clear specific cache key.

```typescript
router.clearCacheKey('users')
```

---

### Router Hooks

#### `useRouter(): Router`

Get router instance in component.

```typescript
Component((ui) => {
  const router = useRouter()
  
  ui.Button({
    text: "Go Home",
    on: { click: () => router.push("/") }
  })
})
```

---

#### `useParams(): Record<string, string>`

Get URL parameters.

```typescript
// Route: /products/:id
// URL: /products/123

Component((ui) => {
  const params = useParams()  // { id: "123" }
  
  ui.Text({ 
    value: params,
    formatter: (p) => `Product ID: ${p.id}`
  })
})
```

---

#### `useQuery(): Record<string, string>`

Get query parameters.

```typescript
// URL: /search?q=laptop&sort=price

Component((ui) => {
  const query = useQuery()  // { q: "laptop", sort: "price" }
  
  ui.Text({ 
    value: query,
    formatter: (q) => `Search: ${q.q}`
  })
})
```

---

### Link Component

```typescript
Link(
  to: string,
  text: string,
  options?: {
    activeClass?: string
    inactiveClass?: string
    className?: string
  }
): HTMLElement
```

**Example:**
```typescript
ui.append(Link("/products", "Products"))

ui.append(Link("/about", "About", {
  activeClass: "font-bold text-blue-600",
  inactiveClass: "text-gray-600"
}))
```

**Behavior:**
- Prevents default link behavior
- Uses `router.push()` for navigation
- Auto-applies `activeClass` when on current route

---

## Types

### `Ref<T>`

```typescript
type Ref<T> = {
  value: T
  subscribe: (callback: (value: T) => void) => () => void
  __cleanup?: (() => void)[]
}
```

---

### `RouteGuard`

```typescript
type RouteGuard = (to: string, from: string) => Promise<boolean> | boolean
```

**Example:**
```typescript
const authGuard: RouteGuard = async (to, from) => {
  const user = await fetchCurrentUser()
  return !!user  // true = allow, false = block
}
```

---

### `FetchResult<T>`

```typescript
type FetchResult<T> = {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  refetch: () => Promise<void>
}
```

---

## Patterns

### Custom Hook Pattern

```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const stored = localStorage.getItem(key)
  const value = ref<T>(stored ? JSON.parse(stored) : initialValue)
  
  watch(value, (val) => {
    localStorage.setItem(key, JSON.stringify(val))
  })
  
  return value
}

// Use it
const theme = useLocalStorage('theme', 'light')
```

---

### Composition Pattern

```typescript
function Card(title: string, content: string) {
  return Component((ui) => {
    ui.Div({ className: "border rounded p-4" }, (ui) => {
      ui.Text({ value: title, className: "text-xl font-bold mb-2" })
      ui.Text({ value: content, className: "text-gray-600" })
    })
  })
}

// Use it
ui.append(Card("Hello", "World"))
```

---

### Form Pattern

```typescript
function FormField(
  label: string,
  value: Ref<string>,
  error: Ref<string | null>
) {
  return Component((ui) => {
    ui.Div({ className: "mb-4" }, (ui) => {
      ui.Text({ value: label, className: "block font-bold mb-1" })
      
      ui.Input({
        value,
        on: {
          input: (e) => {
            value.value = (e.target as HTMLInputElement).value
          }
        },
        className: "border rounded px-3 py-2 w-full"
      })
      
      ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => {
        ui.Text({
          value: error,
          formatter: (e) => e!,
          className: "text-red-500 text-sm mt-1"
        })
      })
    })
  })
}
```

---

## Best Practices

### ✅ Do's

1. **Always use keys in lists:**
```typescript
ui.List({
  items: products,
  key: (p) => p.id,  // ✅ Fast updates
  render: (p, i, ui) => { /* ... */ }
})
```

2. **Use computed values for expensive calculations:**
```typescript
const filtered = watch(items, (i) => i.filter(x => x.active))  // ✅
```

3. **Clean up side effects:**
```typescript
onMount(() => {
  const interval = setInterval(/* ... */, 1000)
  return () => clearInterval(interval)  // ✅
})
```

4. **Type assert when TypeScript can't infer:**
```typescript
const isValid = watch(form, (f) => f.email.includes('@')) as Ref<boolean>  // ✅
```

### ❌ Don'ts

1. **Don't skip keys in dynamic lists:**
```typescript
ui.List({
  items: products,
  render: (p, i, ui) => { /* ... */ }  // ❌ Slow
})
```

2. **Don't recalculate in render:**
```typescript
// ❌ Recalculates every time
ui.Text({ 
  value: items,
  formatter: (i) => i.filter(x => x.active).length
})

// ✅ Computed once
const activeCount = watch(items, (i) => i.filter(x => x.active).length)
ui.Text({ value: activeCount })
```

3. **Don't forget to handle loading/error states:**
```typescript
const { data, loading, error } = fetch<User[]>('/api/users')

// ✅ Handle all states
ui.When(loading, (ui) => { /* ... */ })
ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => { /* ... */ })
ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => { /* ... */ })
```

---

## Quick Reference

| Feature | Import | Usage |
|---------|--------|-------|
| Reactive value | `ref` from `./state` | `ref(initialValue)` |
| Computed value | `watch` from `./state` | `watch(source, fn)` |
| Component | `Component` from `./dsl` | `Component((ui) => {})` |
| Mount hook | `onMount` from `./lifecycle` | `onMount(() => {})` |
| Unmount hook | `onUnmount` from `./lifecycle` | `onUnmount(() => {})` |
| Fetch data | `fetch` from `./fetch` | `fetch<T>(url, opts)` |
| Router | `Router` from `./router` | `new Router()` |
| Navigation | `useRouter` from `./router` | `useRouter().push(path)` |
| URL params | `useParams` from `./router` | `useParams()` |
| Query params | `useQuery` from `./router` | `useQuery()` |
| Link | `Link` from `./router` | `Link(to, text, opts)` |

---

## Examples Repository

Check the `src/main.ts` for a complete working example with:
- Router setup
- Multiple pages
- Data fetching with caching
- Dynamic routes
- Navigation

---

## Support

For issues or questions:
1. Check the [Beginner Guide](./01-beginner.md)
2. Review the [Intermediate Guide](./02-intermediate.md)
3. Study the [Advanced Guide](./03-advanced.md)
4. Examine `src/main.ts` for real examples

---

## Integrations

### `ReactIsland({ component, props? }): HTMLElement`

Mounts a React component subtree inside an AUWLA component tree.

- Install: `npm i react react-dom`
- Props: plain values or AUWLA `Ref`s. `Ref`s are watched; changes trigger React re-renders.
- Cleanup: React root unmounts when the AUWLA component unmounts.

**Example (AUWLA → React props with refs):**
```tsx
import { ReactIsland, ref } from 'auwla'
import ReactHello from './ReactHello'

const title = ref('Hello from AUWLA')
const count = ref(0)

const island = ReactIsland({
  component: ReactHello,
  props: { title, count, onIncrement: () => { count.value++ } }
})
```

**Authoring React island with JSX (classic pragmas):**
```tsx
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import * as React from 'react'

export default function ReactHello(props: { title: string; count: number; onIncrement: () => void }) {
  return (
    <div>
      <p>Title: {props.title}</p>
      <p>Count: {props.count}</p>
      <button onClick={props.onIncrement}>Increment</button>
    </div>
  )
}
```

**Alternative (automatic JSX per file):**
```tsx
/** @jsxImportSource react */
export default function ReactHello({ title, count, onIncrement }) {
  return (
    <div>
      <p>Title: {title}</p>
      <p>Count: {count}</p>
      <button onClick={onIncrement}>Increment</button>
    </div>
  )
}
```

**Dev-only aliasing before publish:**
- Map AUWLA subpaths to local files in `vite.config.ts`:
  - `auwla/jsx-dev-runtime` → `../src/jsx-dev-runtime.ts`
  - `auwla/jsx-runtime` → `../src/jsx-runtime.ts`
  - `auwla` → `../src/index.ts`
- Put subpaths before root alias; add `tsconfig.json` `paths` for type resolution.
