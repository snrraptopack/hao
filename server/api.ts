/**
 * API Routes Definition
 * 
 * Define your API endpoints here with full type safety.
 * Similar to frontend routes, but for API endpoints.
 * 
 * The vite plugin will:
 * 1. Auto-generate type-safe $api client
 * 2. Mount handlers in dev server
 * 3. Provide full IntelliSense for inputs/outputs
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ApiContext<TParams = any, TQuery = any, TBody = any> = {
  req: any
  res: any
  params: TParams
  query: TQuery
  body: TBody
}

export type ApiHandler<TParams = any, TQuery = any, TBody = any, TResponse = any> = (
  ctx: ApiContext<TParams, TQuery, TBody>
) => TResponse | Promise<TResponse>

export type ApiHandlers = {
  GET?: ApiHandler
  POST?: ApiHandler
  PUT?: ApiHandler
  PATCH?: ApiHandler
  DELETE?: ApiHandler
}

export type ApiRoute = {
  name: string
  path: string
  handlers: ApiHandlers
}

// ============================================================================
// Helper Functions (Clean & Simple, like frontend routes)
// ============================================================================

/**
 * Define API route with multiple HTTP method handlers
 * Inspired by Deno Fresh's clean API
 * 
 * @example
 * const users = defineRoute('users', '/users', {
 *   GET: async (ctx) => {
 *     return { users: [...] }
 *   },
 *   POST: async (ctx) => {
 *     return { created: ctx.body }
 *   }
 * })
 * 
 * const user = defineRoute('user', '/users/:id', {
 *   GET: async (ctx) => {
 *     return { id: ctx.params.id, name: 'John' }
 *   },
 *   PATCH: async (ctx) => {
 *     return { updated: true }
 *   },
 *   DELETE: async (ctx) => {
 *     return { deleted: true }
 *   }
 * })
 */
export function defineRoute(name: string, path: string, handlers: ApiHandlers): ApiRoute {
  return { name, path, handlers }
}

/**
 * Compose multiple API routes into a single array
 * 
 * @example
 * const allRoutes = composeRoutes(userRoutes, productRoutes, authRoutes)
 */
export function composeRoutes(...sources: ApiRoute[][]): ApiRoute[] {
  return sources.flat()
}

/**
 * Group routes under a common path prefix (optional utility)
 * 
 * @example
 * const adminRoutes = groupRoutes('/admin', [
 *   defineRoute('dashboard', '/', { GET: ... }),
 *   defineRoute('users', '/users', { GET: ..., POST: ... })
 * ])
 * // Results in: /admin/ and /admin/users
 */
export function groupRoutes(base: string, routes: ApiRoute[]): ApiRoute[] {
  const normalizedBase = base.replace(/\/$/, '')
  return routes.map((route) => ({
    ...route,
    path: `${normalizedBase}${route.path}`,
  }))
}

// ============================================================================
// Example API Routes
// ============================================================================

// Types for demo data
type Product = { id: number; name: string; price: number; description?: string }

// In-memory demo data
const PRODUCTS: Product[] = [
  { id: 1, name: 'Keyboard', price: 49.99, description: 'Mechanical keyboard with blue switches' },
  { id: 2, name: 'Mouse', price: 24.99, description: 'Wireless ergonomic mouse' },
  { id: 3, name: 'Monitor', price: 199.99, description: '27-inch 1440p IPS display' },
]

// Simple hello endpoint
const hello = defineRoute('hello', '/hello', {
  GET: async () => ({
    message: 'Hello from Auwla API!',
    timestamp: new Date().toISOString(),
  }),
})

// Products CRUD - Clean and elegant!
const products = defineRoute('products', '/products', {
  GET: async (ctx) => {
    const page = Number(ctx.query?.page ?? 1)
    const pageSize = Number(ctx.query?.pageSize ?? 10)
    const start = (page - 1) * pageSize
    const items = PRODUCTS.slice(start, start + pageSize)
    return { items, page, pageSize, total: PRODUCTS.length }
  },
  POST: async (ctx) => {
    const body = ctx.body || {}
    const nextId = (PRODUCTS.at(-1)?.id ?? 0) + 1
    const product: Product = {
      id: nextId,
      name: String(body.name ?? 'Unnamed'),
      price: Number(body.price ?? 0),
      description: body.description,
    }
    PRODUCTS.push(product)
    return product
  },
})

// Single product operations
const product = defineRoute('product', '/products/:id', {
  GET: async (ctx) => {
    const id = Number(ctx.params?.id)
    const found = PRODUCTS.find((p) => p.id === id)
    if (!found) {
      return { error: 'Not Found', id }
    }
    return found
  },
  PATCH: async (ctx) => {
    const id = Number(ctx.params?.id)
    const idx = PRODUCTS.findIndex((p) => p.id === id)
    if (idx < 0) {
      return { error: 'Not Found', id }
    }
    const body = ctx.body || {}
    PRODUCTS[idx] = { ...PRODUCTS[idx], ...body }
    return PRODUCTS[idx]
  },
  DELETE: async (ctx) => {
    const id = Number(ctx.params?.id)
    const idx = PRODUCTS.findIndex((p) => p.id === id)
    if (idx < 0) {
      return { error: 'Not Found', id }
    }
    const removed = PRODUCTS.splice(idx, 1)[0]
    return { ok: true, removed }
  },
})

// ============================================================================
// Todo API Routes
// ============================================================================

type Todo = {
  id: number
  text: string
  completed: boolean
  createdAt: string
}

// In-memory todos storage
const TODOS: Todo[] = [
  { id: 1, text: 'Learn Auwla framework', completed: true, createdAt: new Date().toISOString() },
  { id: 2, text: 'Build a todo app', completed: false, createdAt: new Date().toISOString() },
  { id: 3, text: 'Add type-safe API', completed: false, createdAt: new Date().toISOString() },
]

// Todos CRUD
const todos = defineRoute('todos', '/todos', {
  GET: async () => {
    return { todos: TODOS }
  },
  POST: async (ctx) => {
    const body = ctx.body || {}
    const newTodo: Todo = {
      id: TODOS.length > 0 ? Math.max(...TODOS.map(t => t.id)) + 1 : 1,
      text: String(body.text ?? ''),
      completed: false,
      createdAt: new Date().toISOString(),
    }
    TODOS.push(newTodo)
    return newTodo
  },
})

// Single todo operations
const todo = defineRoute('todo', '/todos/:id', {
  PATCH: async (ctx) => {
    const id = Number(ctx.params?.id)
    const idx = TODOS.findIndex((t) => t.id === id)
    if (idx < 0) {
      return { error: 'Not Found', id }
    }
    const body = ctx.body || {}
    TODOS[idx] = { ...TODOS[idx], ...body }
    return TODOS[idx]
  },
  DELETE: async (ctx) => {
    const id = Number(ctx.params?.id)
    const idx = TODOS.findIndex((t) => t.id === id)
    if (idx < 0) {
      return { error: 'Not Found', id }
    }
    const removed = TODOS.splice(idx, 1)[0]
    return { ok: true, removed }
  },
})

// ============================================================================
// Export All Routes (compose them like frontend routes!)
// ============================================================================

export const apiRoutes = composeRoutes(
  [hello], 
  [products, product],
  [todos, todo]
)
