# ⚡ NW-App Framework

A lightweight, reactive UI framework built from scratch with TypeScript. Features reactive state management, efficient DOM diffing, lifecycle hooks, and a full SPA router—all with **zero dependencies**.

## ✨ Features

- 🔄 **Reactive State** - Proxy-based reactivity with subscription model
- 🧩 **Component System** - Chainable DSL for building UIs
- 🎯 **Lifecycle Hooks** - `onMount` / `onUnmount` with automatic cleanup
- 📊 **Efficient Lists** - Keyed diffing for O(1) updates
- 🚦 **SPA Router** - Dynamic routes, guards, query params, caching
- 🌐 **Data Fetching** - Built-in fetch helper with loading/error states
- 🎨 **Tailwind CSS v4** - Modern styling with minimal setup
- 📦 **TypeScript** - Full type safety throughout
- 🚀 **Bun Runtime** - Lightning-fast development and building

## 🚀 Quick Start

```typescript
import { Component } from "./src/dsl"
import { ref } from "./src/state"

const count = ref(0)

const App = Component((ui) => {
  ui.Div({ className: "p-8" }, (ui) => {
    ui.Text({ 
      value: count,
      formatter: (c) => `Count: ${c}`,
      className: "text-2xl mb-4"
    })
    
    ui.Button({
      text: "Increment",
      on: { click: () => count.value++ },
      className: "px-4 py-2 bg-blue-500 text-white rounded"
    })
  })
})

document.querySelector("#app")!.appendChild(App)
```

## 🧰 Create Auwla App (JSX)

- Scaffold a new project with the zero-dependency initializer and minimal JSX template:

```bash
npm create auwla@latest my-app
# Answer prompts, then:
cd my-app
npm install
npm run dev
```

- The template uses Vite + TypeScript with Auwla’s automatic JSX runtime (`jsxImportSource: "auwla"`).
- Routing is ready out of the box: edit `src/routes.tsx` to add pages; `src/main.tsx` initializes `Router` and sets the global router for `Link`.

### Scaffold with Vite (Recommended)

- Non-React baseline (vanilla TS):

```bash
npm create vite@latest auwla -- --template vanilla-ts
```

- React variant (when needed):

```bash
npm create vite@latest auwla-react -- --template react-ts
```

After scaffolding the non‑React app, install and wire Auwla:

```bash
cd auwla
npm i auwla
```

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "auwla",
    "moduleResolution": "Bundler",
    "types": ["vite/client", "auwla/jsx-runtime"]
  }
}
```

Optional (editor reliability): add to the top of `.tsx` files:

```tsx
/** @jsxImportSource auwla */
```

## 📚 Documentation

Start learning the framework step by step:

1. **[Beginner Guide](./docs/01-beginner.md)** - Learn reactivity basics, refs, components, and UI building
2. **[Intermediate Guide](./docs/02-intermediate.md)** - Computed values, lists, conditional rendering, lifecycle
3. **[Advanced Guide](./docs/03-advanced.md)** - Router, state caching, performance optimization, advanced patterns
4. **[API Reference](./docs/04-api-reference.md)** - Complete API documentation
5. **[JSX Guide](./docs/05-jsx-guide.md)** - Use Auwla with JSX (setup, lists, conditionals)

## 🏗️ Architecture

### Reactivity (`src/state.ts`)

```typescript
// Create reactive values
const name = ref("Alice")
const age = ref(30)

// Computed values
const greeting = watch([name, age], ([n, a]) => `${n} is ${a} years old`)

// Subscribe to changes
name.subscribe((newName) => {
  console.log("Name changed to:", newName)
})
```

### Components (`src/dsl.ts`)

```typescript
const UserCard = Component((ui) => {
  ui.Div({ className: "border rounded p-4" }, (ui) => {
    ui.Text({ value: "John Doe", className: "font-bold" })
    ui.Text({ value: "Developer", className: "text-gray-600" })
  })
})
```

### Lists (`src/dsl.ts`)

```typescript
const todos = ref([
  { id: 1, text: "Learn framework", done: ref(false) },
  { id: 2, text: "Build app", done: ref(false) }
])

ui.List({
  items: todos,
  key: (todo) => todo.id,  // Efficient updates!
  render: (todo, i, ui) => {
    ui.Input({
      type: "checkbox",
      checked: todo.done,
      on: { change: () => todo.done.value = !todo.done.value }
    })
    ui.Text({ value: todo.text })
  }
})
```

### Lifecycle (`src/lifecycle.ts`)

```typescript
Component((ui) => {
  onMount(() => {
    console.log("Component mounted!")
    
    const interval = setInterval(() => console.log("Tick"), 1000)
    
    // Cleanup
    return () => clearInterval(interval)
  })
  
  ui.Text({ value: "Hello" })
})
```

### Data Fetching (`src/fetch.ts`)

```typescript
import { fetch as fetchData } from "./src/fetch"

Component((ui) => {
  const { data, loading, error } = fetchData<User[]>(
    '/api/users',
    { cacheKey: 'users' }  // Optional caching
  )
  
  ui.When(loading, (ui) => {
    ui.Text({ value: "Loading..." })
  })
  
  ui.List({
    items: data as Ref<User[]>,
    key: (user) => user.id,
    render: (user, i, ui) => {
      ui.Text({ value: user.name })
    }
  })
})
```

### Router (`src/router.ts`)

```typescript
import { Router, Link } from "./src/router"

const router = new Router()

router.addRoute("/", HomePage)
router.addRoute("/products/:id", ProductDetail)
router.addRoute("/admin", AdminPage, authGuard)  // With guard

router.start()

// Navigation
const Nav = Component((ui) => {
  ui.append(Link("/", "Home"))
  ui.append(Link("/products/123", "Product"))
})
```

## 📁 Project Structure

```
nw-app/
├── src/
│   ├── state.ts          # Reactive state (ref, watch)
│   ├── dsl.ts           # UI builder (Component, List, When)
│   ├── lifecycle.ts     # Lifecycle hooks (onMount, onUnmount)
│   ├── fetch.ts         # Data fetching with caching
│   ├── router.ts        # SPA router with state management
│   ├── main.ts          # Demo application
│   └── style.css        # Tailwind imports
├── docs/
│   ├── 01-beginner.md
│   ├── 02-intermediate.md
│   ├── 03-advanced.md
│   └── 04-api-reference.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── bunfig.toml
```

## 🛠️ Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Setup

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build
```

### Tech Stack

- **Runtime:** Bun
- **Bundler:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Framework:** Custom (built from scratch)

## 🎯 Core Concepts

### 1. Reactivity

Built on a subscription model using JavaScript Proxies:

```typescript
const state = ref(0)

// Subscribes automatically
ui.Text({ value: state })

// Manual subscription
const unsub = state.subscribe((val) => console.log(val))
unsub()  // Unsubscribe
```

### 2. Component Lifecycle

Components have a defined lifecycle with hooks:

```typescript
Component((ui) => {
  onMount(() => {
    // Runs after mount
    return () => {
      // Cleanup on unmount
    }
  })
})
```

### 3. Keyed Lists

Lists use keys for efficient updates:

```typescript
ui.List({
  items: myArray,
  key: (item) => item.id,  // Unique key
  render: (item, i, ui) => { /* ... */ }
})
```

### 4. Router State

Router includes built-in state for caching:

```typescript
const { data } = fetch('/api/data', { cacheKey: 'myData' })
// First visit: fetches
// Return visit: uses router.state.myData
```

## 🔥 Real-World Example

```typescript
import { Component } from "./src/dsl"
import { ref, watch } from "./src/state"
import { Router, Link, useParams } from "./src/router"
import { fetch as fetchData } from "./src/fetch"

type Product = { id: number; name: string; price: number }

// Products list page
function ProductsPage() {
  return Component((ui) => {
    const { data, loading } = fetchData<Product[]>(
      '/api/products',
      { cacheKey: 'products' }
    )
    
    ui.Div({ className: "p-8" }, (ui) => {
      ui.Text({ value: "Products", className: "text-4xl font-bold mb-6" })
      
      ui.When(loading, (ui) => {
        ui.Text({ value: "Loading products..." })
      })
      
      ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
        ui.List({
          items: data as Ref<Product[]>,
          key: (p) => p.id,
          className: "grid grid-cols-3 gap-4",
          render: (product, i, ui) => {
            ui.Div({ className: "border rounded p-4" }, (ui) => {
              ui.Text({ value: product.name, className: "font-bold" })
              ui.Text({ 
                value: `$${product.price}`,
                className: "text-green-600 text-xl"
              })
              ui.append(
                Link(`/products/${product.id}`, "View Details", {
                  className: "text-blue-600 hover:underline"
                })
              )
            })
          }
        })
      })
    })
  })
}

// Product detail page
function ProductDetailPage() {
  return Component((ui) => {
    const params = useParams()
    const { data, loading } = fetchData<Product>(
      `/api/products/${params.id}`,
      { cacheKey: `product-${params.id}` }
    )
    
    ui.Div({ className: "p-8" }, (ui) => {
      ui.append(Link("/products", "← Back", { className: "text-blue-600" }))
      
      ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
        ui.Text({ 
          value: data as Ref<Product>,
          formatter: (p) => p.name,
          className: "text-4xl font-bold my-6"
        })
        ui.Text({
          value: data as Ref<Product>,
          formatter: (p) => `Price: $${p.price}`,
          className: "text-2xl text-green-600"
        })
      })
    })
  })
}

// Setup router
const router = new Router()
router.addRoute("/products", ProductsPage)
router.addRoute("/products/:id", ProductDetailPage)
router.start()

document.querySelector("#app")!.appendChild(router.render())
```

## 🚀 Performance

- **Reactive updates:** Only changed components re-render
- **Keyed lists:** O(1) updates for list items
- **Router caching:** Prevents redundant API calls
- **Automatic cleanup:** No memory leaks

## 🤝 Contributing

This is a learning project built from scratch to understand:
- Reactive programming
- Virtual DOM alternatives (direct DOM manipulation)
- Component lifecycles
- SPA routing
- State management

Feel free to explore the code and learn from it!

## 📝 License

MIT

## 🙏 Acknowledgments

Built with inspiration from modern frameworks but implemented from first principles to deeply understand reactive UI systems.
