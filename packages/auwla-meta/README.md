# @auwla/meta

Meta-framework layer for Auwla providing composable, type-safe page definitions with plugin-based context extension.

## Features

- **Loader-based data fetching**: Separate data loading from rendering
- **Plugin system**: Extend loader context with type-safe plugins
- **Plugin inheritance**: Child routes automatically inherit parent plugins via layouts
- **Zero overhead**: Minimal wrapper around core Auwla primitives
- **Type-safe**: Full TypeScript inference for plugin context composition

## Installation

```bash
npm install @auwla/meta auwla
```

## Basic Usage

### Simple Page

```typescript
import { definePage } from '@auwla/meta'
import { ref } from 'auwla'

export const HomePage = definePage({
  component: () => {
    const count = ref(0)
    return (
      <div>
        <h1>Home</h1>
        <button onClick={() => count.value++}>
          Count: {count}
        </button>
      </div>
    )
  }
})
```

### Page with Loader

```typescript
import { definePage } from '@auwla/meta'
import { createResource } from 'auwla'

export const UserPage = definePage({
  loader: ({ params }) => {
    // Use createResource for caching and loading states
    const user = createResource(
      `user-${params.id}`,
      async (signal) => {
        const res = await fetch(`/api/users/${params.id}`, { signal })
        return res.json()
      },
      { staleTime: 5000 } // Cache for 5 seconds
    )
    
    return { user }
  },
  component: (ctx, { user }) => {
    return (
      <div>
        <h1>User Profile</h1>
        {user.loading.value && <p>Loading...</p>}
        {user.error.value && <p>Error: {user.error.value.message}</p>}
        {user.data.value && (
          <div>
            <p>Name: {user.data.value.name}</p>
            <p>Email: {user.data.value.email}</p>
            <button onClick={() => user.refetch({ force: true })}>
              Refresh
            </button>
          </div>
        )}
      </div>
    )
  }
})
```

## Plugins

Plugins extend the loader context with additional properties and functionality.

### Creating a Plugin

```typescript
import { definePlugin } from '@auwla/meta'

// Extend the global context type
declare global {
  interface AuwlaMetaContext {
    auth: {
      userId: string
      isAuthenticated: boolean
    }
  }
}

export const authPlugin = () => definePlugin({
  name: 'auth',
  onContextCreate(ctx) {
    // Add auth properties to context
    ctx.auth = {
      userId: getCurrentUserId(),
      isAuthenticated: isUserLoggedIn()
    }
  }
})
```

### Using Plugins

```typescript
import { definePage } from '@auwla/meta'
import { authPlugin } from './plugins/auth'

export const DashboardPage = definePage({
  loader: ({ auth, params }) => {
    // auth is fully typed!
    if (!auth.isAuthenticated) {
      throw new Error('Not authenticated')
    }
    
    return { userId: auth.userId }
  },
  component: (ctx, data) => {
    return <div>Welcome, user {data.userId}!</div>
  }
}, [authPlugin()])
```

## Plugin Inheritance with Layouts

Layouts can provide plugins that are automatically inherited by all child pages.

### Define a Layout with Plugins

```typescript
import { defineLayout } from '@auwla/meta'
import { authPlugin } from './plugins/auth'

export const AuthLayout = defineLayout({
  loader: ({ auth }) => {
    // Layout can use plugin context
    return { user: auth.userId }
  },
  component: (ctx, data, child) => {
    return (
      <div class="auth-layout">
        <header>Logged in as: {data.user}</header>
        <main>{child}</main>
      </div>
    )
  }
}, [authPlugin()])
```

### Use Layout with Routes

```typescript
import { defineRoutes, group } from 'auwla'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardPage } from './pages/Dashboard'
import { SettingsPage } from './pages/Settings'

const routes = defineRoutes([
  { path: '/', component: HomePage },
  ...group('/dashboard', { layout: AuthLayout }, [
    { path: '/', component: () => <DashboardPage /> },
    { path: '/settings', component: () => <SettingsPage /> },
  ])
])
```

Now `DashboardPage` and `SettingsPage` automatically have access to the `auth` context from `AuthLayout`!

### Child Pages Inherit Plugins

```typescript
// SettingsPage automatically has auth context from AuthLayout
export const SettingsPage = definePage({
  loader: ({ auth }) => {
    // auth is available without passing authPlugin again!
    return { settings: loadUserSettings(auth.userId) }
  },
  component: (ctx, data) => {
    return <div>Settings for {ctx.auth.userId}</div>
  }
  // No plugins needed - inherited from AuthLayout
})
```

## Fullstack Plugin Example

The included `fullstackPlugin` demonstrates how to inject a type-safe API client:

```typescript
import { definePage, fullstackPlugin } from '@auwla/meta'
import { $api } from './server/api'
import { createResource } from 'auwla'

export const PostsPage = definePage({
  loader: ({ $api }) => {
    // $api is fully typed!
    const posts = createResource(
      'posts',
      (signal) => $api.getPosts({ limit: 10 })
    )
    return { posts }
  },
  component: (ctx, { posts }) => {
    return (
      <div>
        {posts.data.value?.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    )
  }
}, [fullstackPlugin($api)])
```

## Data Fetching Patterns

### Using createResource (Recommended)

For data fetching with caching, use `createResource` from core Auwla:

```typescript
import { createResource } from 'auwla'

const user = createResource(
  'user-123',                    // Cache key
  async (signal) => {            // Fetcher function
    const res = await fetch('/api/user/123', { signal })
    return res.json()
  },
  {
    staleTime: 5000,             // Cache for 5 seconds
    revalidateOnFocus: true      // Refetch when window gains focus
  }
)

// Access data
user.data.value      // The fetched data
user.loading.value   // Loading state
user.error.value     // Error state
user.stale.value     // Whether data is stale

// Refetch
user.refetch({ force: true })
```

### Manual State Management

For simple cases, use `ref` or `createStore`:

```typescript
import { ref } from 'auwla'

loader: async ({ params }) => {
  const data = await fetch(`/api/data/${params.id}`).then(r => r.json())
  return { data }
}
```

### Watching Params for Revalidation

```typescript
import { watch } from 'auwla'

loader: ({ params }) => {
  const user = createResource(
    `user-${params.id}`,
    (signal) => fetchUser(params.id)
  )
  
  // Refetch when params change
  watch(params, () => {
    user.refetch({ force: true })
  })
  
  return { user }
}
```

## Migration from Old API

### Before (Old API)

```typescript
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
```

### After (New API)

```typescript
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
}, [fullstackPlugin($api)])
```

### Key Changes

1. **`context` → `loader`**: Renamed for clarity
2. **No built-in caching**: Use `createResource` instead
3. **Simplified component signature**: Receives `(ctx, loaderData)` instead of `(ctx, { data, loading, error, refetch, invalidate })`
4. **No `revalidateOn`**: Use `watch` manually if needed
5. **No `cacheTtl`**: Use `createResource` with `staleTime` option

## API Reference

### `definePage<Ext, LoaderReturn>(definition, plugins?)`

Define a page component with optional loader and plugins.

**Parameters:**
- `definition.loader?: (ctx: LoaderContext<Ext>) => LoaderReturn | Promise<LoaderReturn>` - Optional data loader
- `definition.component: (ctx: LoaderContext<Ext>, loaderData: LoaderReturn) => HTMLElement` - Component renderer
- `definition.meta?: Record<string, any>` - Optional route metadata
- `plugins?: MetaPlugin<Ext>[]` - Optional plugins to extend context

**Returns:** A component function compatible with Auwla router

### `defineLayout<Ext, LoaderReturn>(definition, plugins?)`

Define a layout component that wraps child routes and provides plugin context.

**Parameters:**
- `definition.loader?: (ctx: LoaderContext<Ext>) => LoaderReturn | Promise<LoaderReturn>` - Optional data loader
- `definition.component: (ctx: LoaderContext<Ext>, loaderData: LoaderReturn, child: HTMLElement) => HTMLElement` - Layout renderer
- `definition.meta?: Record<string, any>` - Optional route metadata
- `plugins?: MetaPlugin<Ext>[]` - Plugins to provide to child routes

**Returns:** A layout function compatible with Auwla router and `group()`

### `definePlugin<Ext>(plugin)`

Define a plugin that extends the loader context.

**Parameters:**
- `plugin.name: string` - Plugin name
- `plugin.onContextCreate?: (ctx: LoaderContext<Ext>) => void | Promise<void>` - Called when context is created
- `plugin.onBeforeLoad?: (ctx: LoaderContext<Ext>) => void | Promise<void>` - Called before loader runs
- `plugin.onAfterLoad?: (ctx: LoaderContext<Ext>, data: any) => void | Promise<void>` - Called after loader completes
- `plugin.onError?: (ctx: LoaderContext<Ext>, error: any) => void | Promise<void>` - Called when loader errors

**Returns:** The plugin object

### `LoaderContext<Ext>`

The context object passed to loaders and components.

**Properties:**
- `params: RouteParams` - Route parameters
- `query: QueryParams` - Query parameters
- `path: string` - Current path
- `router: Router` - Router instance
- `prev: RouteMatch | null` - Previous route match
- `...Ext` - Plugin-provided properties

## License

MIT
