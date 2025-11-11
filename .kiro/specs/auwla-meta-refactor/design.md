# Design Document

## Overview

This design refactors @auwla/meta to be a minimal, type-safe meta-framework layer that leverages core Auwla primitives instead of reimplementing data fetching and caching. The key changes are:

1. Remove built-in caching/revalidation (delegate to `createResource`)
2. Rename `context` → `loader` for clarity
3. Simplify component API (remove `data`, `loading`, `error` refs)
4. Implement plugin context inheritance for nested routes
5. Maintain full type safety with TypeScript generics

## Architecture

### High-Level Flow

```
Route Navigation
    ↓
Plugin Context Creation (with inheritance)
    ↓
Loader Execution (receives plugin context)
    ↓
Component Render (receives loader context)
    ↓
Core Auwla Lifecycle (onMount, etc.)
```

### Key Principles

1. **Delegation over Duplication**: Use core Auwla's `createResource`, `createStore`, `ref` instead of building custom solutions
2. **Type Safety First**: Full TypeScript inference for plugin context composition
3. **Minimal Overhead**: The meta layer should be nearly zero-cost
4. **Composability**: Plugins compose cleanly with proper type merging

## Components and Interfaces

### 0. Plugin Context Provider

```typescript
// Global plugin context stack for inheritance
let pluginContextStack: MetaPlugin<any>[][] = [[]]

export function pushPluginContext(plugins: MetaPlugin<any>[]) {
  const parent = pluginContextStack[pluginContextStack.length - 1] || []
  pluginContextStack.push([...parent, ...plugins])
}

export function popPluginContext() {
  if (pluginContextStack.length > 1) {
    pluginContextStack.pop()
  }
}

export function getCurrentPlugins(): MetaPlugin<any>[] {
  return pluginContextStack[pluginContextStack.length - 1] || []
}
```

**Design Rationale:**
- Stack-based approach handles nested layouts
- Each layout pushes its plugins onto the stack
- Pages inherit from current stack top
- Pop on unmount to clean up

### 1. LoaderContext Type

```typescript
// Base context provided by the router
export type LoaderContextBase = {
  params: RouteParams
  query: QueryParams
  path: string
  router: Router<any>
  prev: RouteMatch<any> | null
}

// Global augmentation for plugins
declare global {
  interface AuwlaMetaContext {}
}

export type LoaderContext<Ext = {}> = LoaderContextBase & AuwlaMetaContext & Ext
```

**Design Rationale:**
- `LoaderContextBase` contains only router-provided data
- Plugins extend via `AuwlaMetaContext` (global augmentation) or generic `Ext`
- No reactive refs in context - users create their own with core primitives

### 2. PageDefinition Type

```typescript
export type PageDefinition<Ext = {}, LoaderReturn = void> = {
  // Optional loader: runs on route navigation
  loader?: (ctx: LoaderContext<Ext>) => LoaderReturn | Promise<LoaderReturn>
  
  // Component: receives the loader context and return value
  component: (ctx: LoaderContext<Ext>, loaderData: LoaderReturn) => HTMLElement
  
  // Optional route meta
  meta?: Record<string, any>
}

// Layout definition (similar but receives child element)
export type LayoutDefinition<Ext = {}, LoaderReturn = void> = {
  loader?: (ctx: LoaderContext<Ext>) => LoaderReturn | Promise<LoaderReturn>
  component: (ctx: LoaderContext<Ext>, loaderData: LoaderReturn, child: HTMLElement) => HTMLElement
  meta?: Record<string, any>
}
```

**Design Rationale:**
- `loader` is optional - pages without data needs don't need it
- `loader` can return any value (or void) - no prescribed shape
- Component receives both context and loader return value
- Layouts receive an additional `child` parameter to wrap
- Removed: `revalidateOn`, `cacheTtl`, `refetch`, `invalidate` - users handle this with `createResource`

### 3. Plugin System

```typescript
export type MetaPlugin<Ext = {}> = {
  name: string
  onContextCreate?: (ctx: LoaderContext<Ext>) => void | Promise<void>
  onBeforeLoad?: (ctx: LoaderContext<Ext>) => void | Promise<void>
  onAfterLoad?: (ctx: LoaderContext<Ext>, data: any) => void | Promise<void>
  onError?: (ctx: LoaderContext<Ext>, error: any) => void | Promise<void>
}

export function definePlugin<Ext = {}>(plugin: MetaPlugin<Ext>): MetaPlugin<Ext> {
  return plugin
}
```

**Design Rationale:**
- Plugins are simple objects with lifecycle hooks
- `onContextCreate` is where plugins add properties to context
- Other hooks are optional for cross-cutting concerns (logging, analytics, etc.)
- Generic `Ext` allows type-safe context extensions

### 4. Runtime System

```typescript
export class MetaRuntime<Ext = {}> {
  private plugins: MetaPlugin<Ext>[]
  
  constructor(plugins: MetaPlugin<Ext>[] = []) {
    this.plugins = plugins
  }
  
  createContext(routed: RoutedContext): LoaderContext<Ext> {
    const ctx = {
      params: routed.params,
      query: routed.query,
      path: routed.path,
      router: routed.router,
      prev: routed.prev,
    } as LoaderContext<Ext>
    
    // Apply plugins synchronously
    for (const plugin of this.plugins) {
      plugin.onContextCreate?.(ctx)
    }
    
    return ctx
  }
  
  async applyBeforeLoad(ctx: LoaderContext<Ext>): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onBeforeLoad?.(ctx)
    }
  }
  
  async applyAfterLoad(ctx: LoaderContext<Ext>, data: any): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onAfterLoad?.(ctx, data)
    }
  }
  
  async applyOnError(ctx: LoaderContext<Ext>, error: any): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onError?.(ctx, error)
    }
  }
}
```

**Design Rationale:**
- Runtime manages plugin lifecycle
- Context creation is synchronous for performance
- Plugin hooks run in order
- Error handling is isolated per plugin

### 5. definePage Implementation

```typescript
export function definePage<Ext = {}, LoaderReturn = void>(
  def: PageDefinition<Ext, LoaderReturn>,
  plugins: MetaPlugin<Ext>[] = []
) {
  const runtime = createMetaRuntime<Ext>(plugins)
  
  return function PageComponent(): HTMLElement {
    const router = useRouter()
    const paramsRef = useParams()
    const queryRef = useQuery()
    
    let ctx: LoaderContext<Ext>
    let loaderData: LoaderReturn = undefined as any
    
    // Initialize context on mount
    onRouted((routed: RoutedContext) => {
      ctx = runtime.createContext(routed)
      
      // Run loader if defined
      if (def.loader) {
        const runLoader = async () => {
          try {
            await runtime.applyBeforeLoad(ctx)
            loaderData = await def.loader!(ctx)
            await runtime.applyAfterLoad(ctx, loaderData)
          } catch (error) {
            await runtime.applyOnError(ctx, error)
            throw error
          }
        }
        
        // Execute loader (can be async)
        void runLoader()
      }
    })
    
    // Render component with context and loader data
    return def.component(ctx, loaderData)
  }
}
```

**Design Rationale:**
- Simplified flow: create context → run loader → render component
- No built-in state management - component creates its own refs
- Loader runs once per navigation (no auto-revalidation)
- Users control re-fetching via `createResource` or manual triggers

## Data Models

### Plugin Context Extension Pattern

```typescript
// Example: Fullstack Plugin
declare global {
  interface AuwlaMetaContext {
    $api: typeof apiClient
  }
}

export function fullstackPlugin<Api>(apiClient: Api): MetaPlugin<{ $api: Api }> {
  return {
    name: 'fullstack',
    onContextCreate(ctx) {
      (ctx as any).$api = apiClient
    }
  }
}
```

### Usage Example

```typescript
// Page with loader
export const UserPage = definePage({
  loader: async ({ $api, params }) => {
    // Use createResource for caching
    const user = createResource(
      `user-${params.id}`,
      (signal) => $api.getUser({ id: params.id })
    )
    return { user }
  },
  component: (ctx, { user }) => {
    return (
      <div>
        {If(() => user.loading.value, () => <p>Loading...</p>)}
        {If(() => user.data.value, (data) => <p>User: {data.name}</p>)}
      </div>
    )
  }
}, [fullstackPlugin($api)])
```

## Plugin Context Inheritance

### Design Challenge

We want child pages to inherit plugin context from parent layouts without modifying core Auwla routes.

### Solution: Layout-Based Plugin Composition

Leverage core Auwla's existing layout system. Plugins are passed to layouts, and layouts pass them down to child pages.

```typescript
// Define a layout with plugins
const DashboardLayout = defineLayout({
  loader: ({ auth }) => {
    // Layout can use plugin context
    return { user: auth.currentUser }
  },
  component: (ctx, data, child) => {
    return (
      <div class="dashboard">
        <nav>User: {data.user.name}</nav>
        {child}
      </div>
    )
  }
}, [authPlugin()])

// Pages inherit layout plugins automatically
const SettingsPage = definePage({
  loader: ({ auth, analytics }) => {
    // Has access to auth from layout + analytics from page
    analytics.track('settings_view')
    return { settings: auth.currentUser.settings }
  },
  component: (ctx, data) => <div>Settings: {data.settings}</div>
}, [analyticsPlugin()]) // Merges with layout plugins

// Route definition (uses core Auwla routes)
const routes = defineRoutes([
  {
    path: '/dashboard',
    layout: DashboardLayout, // Layout provides auth plugin
    component: () => <SettingsPage /> // Page adds analytics plugin
  }
])
```

### Implementation: Plugin Context Provider

```typescript
// Context provider for plugin inheritance
let currentPluginContext: MetaPlugin<any>[] = []

export function setPluginContext(plugins: MetaPlugin<any>[]) {
  currentPluginContext = plugins
}

export function getPluginContext(): MetaPlugin<any>[] {
  return currentPluginContext
}

// defineLayout: wraps layout with plugin context
export function defineLayout<Ext = {}, LoaderReturn = void>(
  def: PageDefinition<Ext, LoaderReturn>,
  plugins: MetaPlugin<Ext>[] = []
) {
  return function LayoutComponent(child: HTMLElement): HTMLElement {
    // Set plugin context for children
    const parentPlugins = getPluginContext()
    const allPlugins = [...parentPlugins, ...plugins]
    setPluginContext(allPlugins)
    
    // Create runtime with all plugins
    const runtime = createMetaRuntime<Ext>(allPlugins)
    const router = useRouter()
    
    let ctx: LoaderContext<Ext>
    let loaderData: LoaderReturn = undefined as any
    
    onRouted((routed: RoutedContext) => {
      ctx = runtime.createContext(routed)
      
      if (def.loader) {
        const runLoader = async () => {
          try {
            await runtime.applyBeforeLoad(ctx)
            loaderData = await def.loader!(ctx)
            await runtime.applyAfterLoad(ctx, loaderData)
          } catch (error) {
            await runtime.applyOnError(ctx, error)
            throw error
          }
        }
        void runLoader()
      }
    })
    
    return def.component(ctx, loaderData, child)
  }
}

// definePage: inherits from current plugin context
export function definePage<Ext = {}, LoaderReturn = void>(
  def: PageDefinition<Ext, LoaderReturn>,
  plugins: MetaPlugin<Ext>[] = []
) {
  const parentPlugins = getPluginContext()
  const allPlugins = [...parentPlugins, ...plugins]
  const runtime = createMetaRuntime<Ext>(allPlugins)
  
  return function PageComponent(): HTMLElement {
    // ... rest of implementation
  }
}
```

**Design Rationale:**
- No modification to core Auwla routes needed
- Leverages existing layout system
- Plugin context flows naturally from layout → page
- Simple global context stack for inheritance
- Type safety maintained through generics

### Type-Safe Plugin Composition

```typescript
// Helper to merge plugin types
type MergePlugins<P1, P2> = P1 & P2

// Example usage
type AuthExt = { auth: { userId: string } }
type AnalyticsExt = { analytics: { track: (event: string) => void } }

type CombinedExt = MergePlugins<AuthExt, AnalyticsExt>
// Result: { auth: { userId: string }, analytics: { track: (event: string) => void } }

// In definePage
const page = definePage<CombinedExt>({
  loader: (ctx) => {
    ctx.auth.userId // ✅ Type-safe
    ctx.analytics.track('page_view') // ✅ Type-safe
  },
  component: (ctx) => <div>...</div>
}, [authPlugin(), analyticsPlugin()])
```

## Error Handling

### Simplified Error Handling

Since we're removing built-in error state, users handle errors with core primitives:

```typescript
// Option 1: Try-catch in loader
loader: async ({ $api, params }) => {
  try {
    const data = await $api.getUser({ id: params.id })
    return { data, error: null }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

// Option 2: Use createResource (handles errors internally)
loader: ({ $api, params }) => {
  const user = createResource(
    `user-${params.id}`,
    (signal) => $api.getUser({ id: params.id })
  )
  return { user } // user.error.value available in component
}

// Option 3: Use onError lifecycle hook
component: (ctx, data) => {
  onError((error) => {
    console.error('Component error:', error)
  })
  return <div>...</div>
}
```

## Testing Strategy

### Unit Tests

1. **Plugin System**
   - Test plugin context creation
   - Test plugin lifecycle hooks
   - Test plugin composition (multiple plugins)
   - Test type inference with plugins

2. **LoaderContext**
   - Test context creation from RoutedContext
   - Test context properties are accessible
   - Test plugin extensions are merged

3. **definePage**
   - Test page without loader
   - Test page with sync loader
   - Test page with async loader
   - Test component receives correct context and data

### Integration Tests

1. **Plugin Inheritance**
   - Test parent plugins available in child routes
   - Test child plugins merge with parent plugins
   - Test deeply nested route plugin inheritance

2. **Router Integration**
   - Test loader runs on navigation
   - Test params/query passed to loader
   - Test component renders with loader data

3. **Core Auwla Integration**
   - Test `createResource` works in loaders
   - Test `createStore` works in loaders
   - Test lifecycle hooks work in components

## Migration Guide

### Breaking Changes

1. **`context` → `loader`**
   ```typescript
   // Before
   definePage({ context: (ctx) => {...} })
   
   // After
   definePage({ loader: (ctx) => {...} })
   ```

2. **Component API**
   ```typescript
   // Before
   component: (ctx, { data, loading, error, refetch }) => {...}
   
   // After
   component: (ctx, loaderData) => {...}
   ```

3. **Removed Features**
   - `revalidateOn` - use `watch` on params/query manually
   - `cacheTtl` - use `createResource` with `staleTime` option
   - `refetch` - use `createResource` and call `resource.refetch()`
   - `invalidate` - use `createResource` and manage cache keys

### Migration Examples

```typescript
// Before: Built-in caching
definePage({
  context: async ({ $api, params }) => {
    return await $api.getUser({ id: params.id })
  },
  component: (ctx, { data, loading, error, refetch }) => {
    return (
      <div>
        {loading.value && <p>Loading...</p>}
        {error.value && <p>Error: {error.value.message}</p>}
        {data.value && <p>User: {data.value.name}</p>}
        <button onClick={() => refetch()}>Refresh</button>
      </div>
    )
  },
  cacheTtl: 5000,
  revalidateOn: 'params'
})

// After: Use createResource
definePage({
  loader: ({ $api, params }) => {
    const user = createResource(
      `user-${params.id}`,
      (signal) => $api.getUser({ id: params.id }),
      { staleTime: 5000 }
    )
    
    // Watch params for revalidation
    watch(params, () => user.refetch({ force: true }))
    
    return { user }
  },
  component: (ctx, { user }) => {
    return (
      <div>
        {user.loading.value && <p>Loading...</p>}
        {user.error.value && <p>Error: {user.error.value.message}</p>}
        {user.data.value && <p>User: {user.data.value.name}</p>}
        <button onClick={() => user.refetch({ force: true })}>Refresh</button>
      </div>
    )
  }
})
```

## Performance Considerations

### Optimizations

1. **Lazy Plugin Execution**: Plugins only run when context is created
2. **No Reactive Overhead**: No built-in refs means fewer subscriptions
3. **Minimal Wrapper**: `definePage` is a thin wrapper around core router
4. **Batched Updates**: Leverage core Auwla's batching for all updates

### Benchmarks (Target)

- Context creation: < 1ms
- Plugin execution: < 0.5ms per plugin
- Memory overhead: < 1KB per page instance
- Bundle size: < 2KB (minified + gzipped)

## Future Enhancements

1. **Layout Plugin Inheritance**: Extend plugin inheritance to layout components
2. **Async Plugin Initialization**: Support async `onContextCreate` for plugins that need setup
3. **Plugin Dependencies**: Allow plugins to declare dependencies on other plugins
4. **DevTools Integration**: Enhanced debugging for plugin context and loader execution
5. **SSR Support**: Adapt loader pattern for server-side rendering
