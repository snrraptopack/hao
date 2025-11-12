# Design Document

## Overview

This design introduces a simplified plugin system for Auwla that focuses on composability, type safety, and simplicity. The key insight is that plugins should just return objects that get merged into the page context - no complex lifecycle, no magic, just simple composition.

**Core Principles:**
1. Plugins are just functions that return objects
2. Context is just route info + plugin objects
3. Type inference handles everything automatically
4. Layouts naturally pass context to children
5. No separation between "loader" and "component"

## Architecture

### High-Level Flow

```
Layout Mounts
    ↓
Create Layout Plugin Context
    ↓
Push Context to Stack
    ↓
Page Renders
    ↓
Merge Stack Context + Page Plugins
    ↓
Pass Full Context to Component
    ↓
Component Uses Core Auwla Primitives
```

### Key Design Decisions

1. **No Loaders** - Data fetching happens in component using `createResource`
2. **Simple Plugins** - Just return an object, no lifecycle required
3. **Context Stack** - Track plugin inheritance through layout hierarchy
4. **Type Inference** - TypeScript figures out the merged context type
5. **Core Integration** - Part of Auwla, not a separate package

## Components and Interfaces

### 1. Plugin Definition (Core Auwla)

```typescript
// src/plugin.ts
export type Plugin<T = any> = () => T

export function definePlugin<T>(setup: () => T): Plugin<T> {
  return setup
}

// Type helper to extract plugin return types
export type InferPlugins<P extends readonly Plugin<any>[]> = 
  P extends readonly [Plugin<infer T>, ...infer Rest]
    ? T & (Rest extends readonly Plugin<any>[] ? InferPlugins<Rest> : {})
    : {}
```

**Design Rationale:**
- Plugin is just a function that returns any object
- `definePlugin` is identity function for type inference
- `InferPlugins` recursively merges plugin types
- No lifecycle hooks required (optional)

### 2. Plugin Context Provider (Core Auwla)

```typescript
// src/plugin.ts
let pluginContextStack: any[] = [{}]

export function pushPluginContext(context: any): void {
  const parent = pluginContextStack[pluginContextStack.length - 1] || {}
  pluginContextStack.push({ ...parent, ...context })
}

export function popPluginContext(): void {
  if (pluginContextStack.length > 1) {
    pluginContextStack.pop()
  }
}

export function getPluginContext<T = any>(): T {
  return pluginContextStack[pluginContextStack.length - 1] as T
}

export function createPluginContext<P extends readonly Plugin<any>[]>(
  plugins: P
): InferPlugins<P> {
  const context: any = {}
  
  for (const plugin of plugins) {
    const pluginResult = plugin()
    Object.assign(context, pluginResult)
  }
  
  return context
}
```

**Design Rationale:**
- Stack-based approach handles nested layouts
- Each layout pushes merged context
- Pages get current stack top + their own plugins
- Simple object merging, no magic

### 3. Page Context Type

```typescript
// src/meta.ts (or integrated into router.ts)
import type { RouteParams, QueryParams, Router, RouteMatch } from './router'
import type { Plugin, InferPlugins } from './plugin'

export type PageContext<P extends readonly Plugin<any>[] = []> = {
  params: RouteParams
  query: QueryParams
  path: string
  router: Router<any>
  prev: RouteMatch<any> | null
} & InferPlugins<P>
```

**Design Rationale:**
- Minimal context - just route info
- Plugin types merged via `InferPlugins`
- No lifecycle hooks (use core imports)
- No reactive primitives (use core imports)

### 4. definePage Implementation

```typescript
// src/meta.ts
import { useRouter, useParams, useQuery, onRouted, onUnmount } from './router'
import { getPluginContext, createPluginContext, type Plugin, type InferPlugins } from './plugin'

export function definePage<P extends readonly Plugin<any>[]>(
  component: (ctx: PageContext<P>) => HTMLElement,
  plugins: P = [] as any
) {
  return function PageComponent(): HTMLElement {
    const router = useRouter()
    const paramsRef = useParams()
    const queryRef = useQuery()
    
    // Get parent context from stack
    const parentContext = getPluginContext()
    
    // Create page plugin context
    const pagePluginContext = createPluginContext(plugins)
    
    // Merge parent + page plugins
    const fullPluginContext = { ...parentContext, ...pagePluginContext }
    
    // Build complete context
    let ctx: PageContext<P>
    
    const updateContext = () => {
      ctx = {
        params: paramsRef.value,
        query: queryRef.value,
        path: router.currentPath.value,
        router,
        prev: router.getCurrentRoute(),
        ...fullPluginContext
      } as PageContext<P>
    }
    
    // Initialize context
    updateContext()
    
    // Update context on route changes
    onRouted(() => {
      updateContext()
    })
    
    // Render component with context
    return component(ctx)
  }
}
```

**Design Rationale:**
- Inherit from parent context stack
- Merge with page-specific plugins
- Pass full context to component
- Component handles all data fetching
- No loader execution logic

### 5. defineLayout Implementation

```typescript
// src/meta.ts
export function defineLayout<P extends readonly Plugin<any>[]>(
  component: (ctx: PageContext<P>, child: HTMLElement) => HTMLElement,
  plugins: P = [] as any
) {
  return function LayoutComponent(child: HTMLElement): HTMLElement {
    const router = useRouter()
    const paramsRef = useParams()
    const queryRef = useQuery()
    
    // Get parent context
    const parentContext = getPluginContext()
    
    // Create layout plugin context
    const layoutPluginContext = createPluginContext(plugins)
    
    // Merge parent + layout plugins
    const fullPluginContext = { ...parentContext, ...layoutPluginContext }
    
    // Push context for children
    pushPluginContext(fullPluginContext)
    
    // Clean up on unmount
    onUnmount(() => {
      popPluginContext()
    })
    
    // Build complete context
    let ctx: PageContext<P>
    
    const updateContext = () => {
      ctx = {
        params: paramsRef.value,
        query: queryRef.value,
        path: router.currentPath.value,
        router,
        prev: router.getCurrentRoute(),
        ...fullPluginContext
      } as PageContext<P>
    }
    
    updateContext()
    
    onRouted(() => {
      updateContext()
    })
    
    // Render layout with child
    return component(ctx, child)
  }
}
```

**Design Rationale:**
- Push context onto stack for children
- Pop context on unmount
- Same context structure as pages
- Child element passed through

## Data Models

### Plugin Examples

#### Simple Plugin

```typescript
import { ref } from 'auwla'

const counterPlugin = definePlugin(() => ({
  count: ref(0),
  increment() {
    this.count.value++
  }
}))
```

#### Complex Plugin with State

```typescript
import { ref, createStore } from 'auwla'

const authPlugin = definePlugin(() => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  
  return {
    user,
    isAuthenticated,
    async login(email: string, password: string) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (response.ok) {
        const data = await response.json()
        user.value = data.user
        isAuthenticated.value = true
      } else {
        throw new Error('Login failed')
      }
    },
    async logout() {
      await fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      isAuthenticated.value = false
    }
  }
})
```

#### Plugin with External Dependencies

```typescript
const fullstackPlugin = definePlugin(() => ({
  $api: apiClient
}))

const analyticsPlugin = definePlugin(() => ({
  analytics: {
    track(event: string, data?: any) {
      console.log(`[Analytics] ${event}`, data)
      // Send to analytics service
    }
  }
}))
```

### Usage Examples

#### Basic Page

```typescript
import { ref, createResource, onMount } from 'auwla'
import { definePage } from 'auwla'

const HomePage = definePage((ctx) => {
  const message = ref('Hello World')
  
  return (
    <div>
      <h1>{message}</h1>
      <p>Path: {ctx.path}</p>
    </div>
  )
})
```

#### Page with Data Fetching

```typescript
import { createResource, onRouted } from 'auwla'
import { definePage, fullstackPlugin } from 'auwla'

const UserPage = definePage(
  (ctx) => {
    const user = createResource(
      `user-${ctx.params.id}`,
      (signal) => ctx.$api.getUser({ id: ctx.params.id })
    )
    
    // Refetch on route change
    onRouted(() => {
      user.refetch({ force: true })
    })
    
    return (
      <div>
        {user.loading.value && <p>Loading...</p>}
        {user.error.value && <p>Error: {user.error.value.message}</p>}
        {user.data.value && (
          <div>
            <h1>{user.data.value.name}</h1>
            <p>Email: {user.data.value.email}</p>
          </div>
        )}
      </div>
    )
  },
  [fullstackPlugin($api)]
)
```

#### Layout with Plugin Inheritance

```typescript
import { onMount } from 'auwla'
import { defineLayout, authPlugin } from 'auwla'

const AuthLayout = defineLayout(
  (ctx, child) => {
    onMount(() => {
      if (!ctx.auth.isAuthenticated.value) {
        ctx.router.push('/login')
      }
    })
    
    return (
      <div class="auth-layout">
        <header>
          <p>User: {ctx.auth.user.value?.name}</p>
          <button onClick={() => ctx.auth.logout()}>Logout</button>
        </header>
        <main>{child}</main>
      </div>
    )
  },
  [authPlugin()]
)

// Child page inherits auth plugin
const DashboardPage = definePage(
  (ctx) => {
    // ctx.auth is available from layout
    // ctx.analytics is added by this page
    
    onMount(() => {
      ctx.analytics.track('dashboard_view')
    })
    
    return (
      <div>
        <h1>Dashboard</h1>
        <p>Welcome, {ctx.auth.user.value?.name}</p>
      </div>
    )
  },
  [analyticsPlugin()]
)
```

#### Multiple Plugins

```typescript
const Page = definePage(
  (ctx) => {
    // All plugin contexts available with full type safety
    const user = ctx.auth.user.value
    const greeting = ctx.i18n.t('welcome')
    
    onMount(() => {
      ctx.analytics.track('page_view')
    })
    
    return (
      <div>
        <h1>{greeting}, {user?.name}</h1>
      </div>
    )
  },
  [authPlugin(), i18nPlugin(), analyticsPlugin()]
)
```

## Type Safety

### Automatic Type Inference

```typescript
// TypeScript automatically infers the full context type
const authPlugin = definePlugin(() => ({
  user: ref<User | null>(null),
  login: async (email: string, password: string) => { /* ... */ }
}))

const i18nPlugin = definePlugin(() => ({
  locale: ref('en'),
  t: (key: string) => translations[key]
}))

const Page = definePage(
  (ctx) => {
    // TypeScript knows:
    // ctx.params: RouteParams ✅
    // ctx.query: QueryParams ✅
    // ctx.user: Ref<User | null> ✅
    // ctx.login: (email: string, password: string) => Promise<void> ✅
    // ctx.locale: Ref<string> ✅
    // ctx.t: (key: string) => string ✅
    
    ctx.user.value // ✅ Type-safe
    ctx.login('test@example.com', 'password') // ✅ Type-safe
    ctx.t('welcome') // ✅ Type-safe
    
    return <div/>
  },
  [authPlugin, i18nPlugin]
)
```

### Plugin Composition Types

```typescript
// Helper type to test plugin composition
type TestPlugins = InferPlugins<[
  typeof authPlugin,
  typeof i18nPlugin,
  typeof analyticsPlugin
]>

// Result:
// {
//   user: Ref<User | null>
//   login: (email: string, password: string) => Promise<void>
//   locale: Ref<string>
//   t: (key: string) => string
//   analytics: { track: (event: string, data?: any) => void }
// }
```

## Error Handling

### Plugin Errors

```typescript
const Page = definePage(
  (ctx) => {
    const user = createResource(
      'user',
      async (signal) => {
        try {
          return await ctx.$api.getUser({ id: ctx.params.id })
        } catch (error) {
          console.error('Failed to fetch user:', error)
          throw error
        }
      }
    )
    
    return (
      <div>
        {user.error.value && (
          <div class="error">
            Error: {user.error.value.message}
          </div>
        )}
      </div>
    )
  },
  [fullstackPlugin($api)]
)
```

### Auth Guard Example

```typescript
const authPlugin = definePlugin(() => {
  const user = ref<User | null>(null)
  
  return {
    user,
    requireAuth() {
      if (!user.value) {
        throw new Error('Authentication required')
      }
    }
  }
})

const ProtectedPage = definePage(
  (ctx) => {
    onMount(() => {
      try {
        ctx.auth.requireAuth()
      } catch (error) {
        ctx.router.push('/login')
      }
    })
    
    return <div>Protected Content</div>
  },
  [authPlugin()]
)
```

## Performance Considerations

### Plugin Execution

- Plugins execute once per page render
- Plugin results are cached in context
- No reactive overhead unless plugin uses refs
- Object merging is fast (shallow copy)

### Memory Management

- Context stack cleaned up on unmount
- Plugin instances can be reused across pages
- No memory leaks from context inheritance

### Optimization Strategies

1. **Singleton Plugins** - Create plugin once, reuse everywhere
2. **Lazy Initialization** - Defer expensive setup until needed
3. **Memoization** - Cache expensive computations in plugins

```typescript
// Singleton pattern
const authPluginInstance = authPlugin()

const Page1 = definePage((ctx) => <div/>, [authPluginInstance])
const Page2 = definePage((ctx) => <div/>, [authPluginInstance])
```

## Migration Guide

### From Old API

**Before:**
```typescript
definePage({
  loader: async ({ $api, params }) => {
    return await $api.getUser({ id: params.id })
  },
  component: (ctx, { user }) => {
    return <div>{user.name}</div>
  }
}, [fullstackPlugin($api)])
```

**After:**
```typescript
definePage(
  (ctx) => {
    const user = createResource(
      `user-${ctx.params.id}`,
      () => ctx.$api.getUser({ id: ctx.params.id })
    )
    
    return (
      <div>
        {user.data.value && <p>{user.data.value.name}</p>}
      </div>
    )
  },
  [fullstackPlugin($api)]
)
```

### Key Changes

1. **No loader** - Use `createResource` in component
2. **Single function** - Component receives full context
3. **Import lifecycle** - `onMount`, `onRouted` from core
4. **Simple plugins** - Just return an object

## Testing Strategy

### Unit Tests

1. **Plugin Definition**
   - Test `definePlugin` returns function
   - Test plugin execution returns object
   - Test plugin with reactive primitives

2. **Context Provider**
   - Test push/pop context stack
   - Test context inheritance
   - Test context cleanup

3. **Type Inference**
   - Test single plugin type inference
   - Test multiple plugin type composition
   - Test nested plugin types

### Integration Tests

1. **Page Rendering**
   - Test page without plugins
   - Test page with single plugin
   - Test page with multiple plugins

2. **Layout Inheritance**
   - Test layout provides context to child
   - Test nested layouts
   - Test context cleanup on unmount

3. **Router Integration**
   - Test context updates on navigation
   - Test params/query in context
   - Test plugin context persists across routes

## Future Enhancements

1. **Plugin Dependencies** - Declare plugin depends on another
2. **Async Plugins** - Support async initialization
3. **Plugin Lifecycle** - Optional hooks for advanced use cases
4. **DevTools** - Visualize plugin context in browser
5. **Plugin Marketplace** - Share common plugins

## Summary

This design provides a minimal, type-safe plugin system that:
- Makes plugins dead simple (just return an object)
- Provides automatic type inference
- Handles context inheritance naturally
- Integrates seamlessly with core Auwla
- Doesn't mimic React patterns

The key insight is that in Auwla's reactive model, we don't need loaders or complex lifecycle - just compose reactive primitives in a single function with plugin-provided context.
