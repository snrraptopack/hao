# Advanced Resource Management with `createResource()`

In the previous guides, we learned about `fetch()` for automatic data loading and `asyncOp()` for manual operations. Both of these helpers are actually built on top of a more powerful primitive: **`createResource()`**.

This guide dives deep into `createResource()`, revealing how to build sophisticated data management with caching, revalidation, cross-component sharing, and intelligent scope control.

> **What You'll Learn**
>
> - Understanding the power of `createResource()` as the foundation
> - How `fetch()` and `asyncOp()` use `createResource()` internally
> - The critical `scope` property: `'global'` vs `'route'`
> - Automatic caching and deduplication
> - Stale-while-revalidate (SWR) patterns
> - Focus revalidation and background updates
> - Cross-component data sharing
> - Manual cache control and invalidation
{style="note"}

## Understanding the Foundation

Both `fetch()` and `asyncOp()` are convenience wrappers around `createResource()`:

<tabs>
<tab title="fetch() wrapper">

```TypeScriptJSX
// What fetch() does internally
export function fetch<T>(url: string | (() => string), options?: { cacheKey?: string }) {
  const key = options?.cacheKey ?? `fetch:${typeof url === 'string' ? url : Date.now()}`;
  
  const resource = createResource<T>(key, async (signal) => {
    const urlString = typeof url === 'function' ? url() : url;
    const response = await window.fetch(urlString, { signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  }, { scope: options?.cacheKey ? 'route' : 'global' });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch
  };
}
```

**Key points:**
- Uses `createResource()` under the hood
- Generates a cache key automatically
- Sets `scope: 'route'` when you provide a `cacheKey`
- Passes abort signal to native `window.fetch()`
- Returns simplified API (hides `stale`, `updatedAt`)

</tab>
<tab title="asyncOp() wrapper">

```TypeScriptJSX
// What asyncOp() does internally (simplified)
export function asyncOp<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const execute = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const result = await fn();
      data.value = result;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  };
  
  return { data, loading, error, refetch: execute };
}
```

**Key difference:**
- Does NOT use `createResource()` (no caching needed)
- No lifecycle hooks (doesn't auto-run on mount)
- No abort signal management
- Simple state container for manual operations

</tab>
</tabs>

## The `createResource()` API

Let's understand the complete API:

```TypeScriptJSX
import { createResource } from 'auwla';

const resource = createResource<T>(
  key,           // Unique cache key (string)
  fetcher,       // Async function that receives AbortSignal
  options        // Configuration object
);
```

### Parameters

**1. `key: string`** - The unique cache key
- Must be unique across your application
- Same key = shared data across components
- Example: `'users'`, `'posts'`, `'user:123'`

**2. `fetcher: (signal: AbortSignal) => Promise<T>`** - The data fetching function
- Receives an `AbortSignal` automatically
- Must pass signal to fetch requests
- Can throw errors (handled automatically)

**3. `options?: ResourceOptions<T>`** - Configuration object (optional)

```TypeScript
type ResourceOptions<T> = {
  staleTime?: number;              // Time in ms before data is considered stale
  revalidateOnFocus?: boolean;     // Refetch when window regains focus
  scope?: 'global' | 'route';      // Where to cache the data
  parse?: (raw: unknown) => T;     // Transform response data
}
```

### Return Value

```TypeScript
type Resource<T> = {
  data: Ref<T | null>;              // The fetched data (reactive)
  error: Ref<string | null>;        // Error message if fetch fails
  loading: Ref<boolean>;            // True during initial fetch only
  stale: Ref<boolean>;              // True when data needs revalidation
  updatedAt: Ref<number | null>;    // Timestamp of last successful fetch
  refetch: (opts?: { force?: boolean }) => Promise<void>;  // Manual refetch
}
```

## The Critical `scope` Property

The `scope` option determines **where** and **how long** your data is cached. This is one of the most important concepts to understand.

### `scope: 'global'` (Default)

**Global scope** means the data lives in application memory and persists across route changes.

```TypeScriptJSX
import { createResource } from 'auwla';

type User = { id: number; name: string };

// Global scope - data persists across routes
const userResource = createResource<User>(
  'current-user',
  async (signal) => {
    const res = await window.fetch('/api/user', { signal });
    return res.json();
  },
  { scope: 'global' }  // ← Lives in memory
);
```

**Characteristics:**
- ✅ Data cached in JavaScript memory (`Map`)
- ✅ Persists when navigating between routes
- ✅ Shared across all components that use the same key
- ✅ Survives until page refresh
- ❌ NOT synced to router state
- ❌ Lost on page reload

**Use cases:**
- User authentication state
- Application-wide settings
- Data that doesn't change per route
- Frequently accessed data

**Example - Shared user data:**

```TypeScriptJSX
// In UserProfile.tsx
export function UserProfile() {
  const { data: user, loading } = createResource<User>(
    'current-user',  // ← Same key
    async (signal) => {
      const res = await window.fetch('/api/user', { signal });
      return res.json();
    },
    { scope: 'global' }
  );

  return <div>{user.value?.name}</div>;
}

// In UserSettings.tsx (different component)
export function UserSettings() {
  const { data: user } = createResource<User>(
    'current-user',  // ← Same key! Gets cached data instantly
    async (signal) => {
      const res = await window.fetch('/api/user', { signal });
      return res.json();
    },
    { scope: 'global' }
  );

  // No loading spinner! Data already cached from UserProfile
  return <div>Edit {user.value?.name}</div>;
}
```

**What happens:**
1. `UserProfile` mounts → fetches user data → caches with key `'current-user'`
2. `UserSettings` mounts → sees cached data → **no network request!**
3. Both components share the same reactive `user` ref
4. Updating in one component updates everywhere

### `scope: 'route'`

**Route scope** means the data is synced to the router's state and persists across page reloads (if using server-side rendering or state serialization).

```TypeScriptJSX
import { createResource } from 'auwla';

type Product = { id: number; name: string; price: number };

// Route scope - data synced to router state
const productResource = createResource<Product>(
  'product:123',
  async (signal) => {
    const res = await window.fetch('/api/products/123', { signal });
    return res.json();
  },
  { scope: 'route' }  // ← Synced to router.state
);
```

**Characteristics:**
- ✅ Data cached in router state (`router.state[key]`)
- ✅ Can be serialized and sent to client (SSR)
- ✅ Survives route navigation
- ✅ Can be pre-populated on server
- ⚠️ Cleared when navigating away from route (route-specific)
- ⚠️ More memory overhead (stored in two places)

**Use cases:**
- Route-specific data (product details, post content)
- Data needed for SSR/pre-rendering
- Data that should be cached per-route
- Data that might be pre-fetched on the server

**Example - Route-scoped product page:**

```TypeScriptJSX
// In ProductPage.tsx at route /product/:id
export function ProductPage({ id }: { id: string }) {
  const { data: product, loading, error } = createResource<Product>(
    `product:${id}`,  // ← Unique key per product
    async (signal) => {
      const res = await window.fetch(`/api/products/${id}`, { signal });
      return res.json();
    },
    { scope: 'route' }  // ← Synced to router state
  );

  return (
    <When>
      {loading}
      {() => <div>Loading product...</div>}
      {() => (
        <div>
          <h1>{product.value?.name}</h1>
          <p>${product.value?.price}</p>
        </div>
      )}
    </When>
  );
}
```

**What happens with route scope:**
1. User visits `/product/123`
2. Data fetches and stores in `router.state['product:123']`
3. User navigates to `/cart`
4. User clicks back → `/product/123`
5. **Data loads instantly from router.state!** (no network request)

### Scope Comparison Table

| Feature | `scope: 'global'` | `scope: 'route'` |
|---------|-------------------|------------------|
| **Storage** | Memory cache (`Map`) | Router state (`router.state`) |
| **Lifetime** | Until page reload | Until route change |
| **SSR Support** | ❌ No | ✅ Yes (can serialize) |
| **Cross-route** | ✅ Yes | ❌ No |
| **Pre-population** | ❌ No | ✅ Yes (server can inject) |
| **Use for** | App-wide data | Route-specific data |

### When to Use Which Scope

<tabs>
<tab title="Use 'global' for">

**Application-wide data that doesn't change per route:**

```TypeScriptJSX
// ✅ Current user (same everywhere)
createResource('current-user', fetchUser, { scope: 'global' });

// ✅ App settings (same everywhere)
createResource('app-settings', fetchSettings, { scope: 'global' });

// ✅ Frequently used lists
createResource('categories', fetchCategories, { scope: 'global' });

// ✅ Session data
createResource('session', fetchSession, { scope: 'global' });
```

**Benefits:**
- Data survives route navigation
- Shared across entire app
- Minimal memory footprint
- No duplication

</tab>
<tab title="Use 'route' for">

**Route-specific data that's tied to a URL:**

```TypeScriptJSX
// ✅ Product details (changes per product)
createResource(`product:${id}`, fetchProduct, { scope: 'route' });

// ✅ Blog post (changes per post)
createResource(`post:${slug}`, fetchPost, { scope: 'route' });

// ✅ User profile (changes per user)
createResource(`profile:${userId}`, fetchProfile, { scope: 'route' });

// ✅ Search results (changes per query)
createResource(`search:${query}`, fetchResults, { scope: 'route' });
```

**Benefits:**
- Can be pre-fetched on server (SSR)
- Cached per route (back/forward works instantly)
- Can be injected into initial HTML
- Cleaned up when leaving route

</tab>
</tabs>

## Automatic Caching and Deduplication

`createResource()` automatically deduplicates requests with the same key:

```TypeScriptJSX
import { createResource } from 'auwla';

// Component A
function ComponentA() {
  const { data, loading } = createResource('users', fetchUsers);
  return <div>{loading.value ? 'Loading...' : data.value?.length}</div>;
}

// Component B (mounts simultaneously)
function ComponentB() {
  const { data, loading } = createResource('users', fetchUsers);
  return <div>{loading.value ? 'Loading...' : data.value?.length}</div>;
}
```

**What happens:**
1. Both components mount at the same time
2. Both call `createResource('users', ...)`
3. **Only ONE network request is made!**
4. Both components share the same `data`, `loading`, `error` refs
5. Both update simultaneously when data arrives

**How it works:**
- First call creates a cache entry
- Subsequent calls with same key return existing entry
- All components share the same reactive refs
- Request is only sent once (deduplication)

## Stale-While-Revalidate (SWR) Pattern

The `staleTime` option enables automatic background revalidation:

```TypeScriptJSX
import { createResource } from 'auwla';

const { data, loading, stale } = createResource<User[]>(
  'users',
  async (signal) => {
    const res = await window.fetch('/api/users', { signal });
    return res.json();
  },
  { 
    staleTime: 60000  // ← Data becomes stale after 60 seconds
  }
);
```

**Timeline:**

```
t=0s:    Component mounts
         → Fetches data
         → data.value = [...users]
         → stale.value = false
         → loading.value = false

t=60s:   staleTime expires
         → stale.value = true (data marked as stale)
         → Automatic background refetch starts
         → User still sees old data! (no loading spinner)

t=61s:   Background fetch completes
         → data.value = [...new users]
         → stale.value = false
         → User sees updated data smoothly
```

**Benefits:**
- Old data stays visible (no loading spinner)
- Fresh data fetches in background
- Smooth user experience
- Automatic cache invalidation

**Use cases:**

```TypeScriptJSX
// Frequent updates - short staleTime
createResource('live-scores', fetchScores, { 
  staleTime: 5000  // 5 seconds
});

// Moderate updates
createResource('notifications', fetchNotifications, { 
  staleTime: 30000  // 30 seconds
});

// Rare updates - long staleTime
createResource('user-profile', fetchProfile, { 
  staleTime: 300000  // 5 minutes
});

// Static data - no staleTime
createResource('countries', fetchCountries, {
  // No staleTime = never becomes stale
});
```

## Focus Revalidation

The `revalidateOnFocus` option refetches data when the user returns to your tab:

```TypeScriptJSX
import { createResource } from 'auwla';

const { data } = createResource<Message[]>(
  'messages',
  async (signal) => {
    const res = await window.fetch('/api/messages', { signal });
    return res.json();
  },
  { 
    revalidateOnFocus: true  // ← Refetch on window focus
  }
);
```

**What happens:**
1. User views your app → data loads
2. User switches to another tab (email, Slack, etc.)
3. User switches back to your app
4. **Data automatically refetches!** (gets latest messages)

**Use cases:**
- Real-time-ish data (messages, notifications)
- Data that might change while user is away
- Dashboards and monitoring apps
- Collaborative tools

**Combine with staleTime:**

```TypeScriptJSX
createResource('dashboard-data', fetchDashboard, {
  staleTime: 60000,        // Revalidate after 60s
  revalidateOnFocus: true  // Also revalidate on focus
});
```

Now data revalidates:
- After 60 seconds automatically
- When user returns to tab

## Data Transformation with `parse`

The `parse` option transforms the response before storing:

```TypeScriptJSX
import { createResource } from 'auwla';

type User = {
  id: number;
  name: string;
  createdAt: Date;  // ← We want Date objects, not strings
};

const { data } = createResource<User[]>(
  'users',
  async (signal) => {
    const res = await window.fetch('/api/users', { signal });
    return res.json();  // Returns objects with string dates
  },
  {
    parse: (raw: any) => {
      // Transform each user
      return raw.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt)  // ← Convert string to Date
      }));
    }
  }
);

// Now data.value has real Date objects!
console.log(data.value?.[0].createdAt.getFullYear());  // Works!
```

**Use cases:**
- Converting string dates to Date objects
- Normalizing API responses
- Adding computed properties
- Filtering/sorting data
- Type coercion

## Manual Cache Control

### Force Refetch

Bypass the cache and force a fresh fetch:

```TypeScriptJSX
const { refetch } = createResource('users', fetchUsers);

// Normal refetch (uses cache if request in-flight)
await refetch();

// Force refetch (ignores in-flight, always fetches fresh)
await refetch({ force: true });
```

**Example - Refresh button:**

```TypeScriptJSX
export function UserList() {
  const { data, loading, refetch } = createResource<User[]>(
    'users',
    async (signal) => {
      const res = await window.fetch('/api/users', { signal });
      return res.json();
    }
  );

  return (
    <div>
      <button onClick={() => refetch({ force: true })}>
        🔄 Force Refresh
      </button>
      
      <For each={data}>
        {(user) => <div>{user.name}</div>}
      </For>
    </div>
  );
}
```

### Invalidate and Refetch After Mutations

Common pattern: invalidate cache after creating/updating/deleting:

```TypeScriptJSX
import { createResource, asyncOp } from 'auwla';

export function UserManagement() {
  // Load users list
  const { data: users, refetch: refetchUsers } = createResource<User[]>(
    'users',
    async (signal) => {
      const res = await window.fetch('/api/users', { signal });
      return res.json();
    }
  );

  // Delete user operation
  const { loading: deleting, refetch: deleteUser } = asyncOp(async (userId: number) => {
    const res = await window.fetch(`/api/users/${userId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Delete failed');

    // Invalidate and refetch users list
    await refetchUsers({ force: true });
  });

  // Create user operation
  const { loading: creating, refetch: createUser } = asyncOp(async (userData: any) => {
    const res = await window.fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    if (!res.ok) throw new Error('Create failed');

    // Invalidate and refetch users list
    await refetchUsers({ force: true });
  });

  return (
    <div>
      <button onClick={() => createUser({ name: 'New User' })}>
        Add User
      </button>

      <For each={users}>
        {(user) => (
          <div>
            {user.name}
            <button onClick={() => deleteUser(user.id)}>Delete</button>
          </div>
        )}
      </For>
    </div>
  );
}
```

## Real-World Example: Complete Data Management

Let's build a comprehensive example showing all features:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { createResource, asyncOp } from 'auwla';
import { When, For } from 'auwla';

type Post = {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
};

type User = {
  id: number;
  name: string;
};

export function BlogApp() {
  const selectedAuthor = ref<string | null>(null);

  // Global: Current user (persists across routes)
  const { data: currentUser } = createResource<User>(
    'current-user',
    async (signal) => {
      const res = await window.fetch('/api/user', { signal });
      return res.json();
    },
    { 
      scope: 'global',  // ← Persists everywhere
      staleTime: 300000  // 5 minutes
    }
  );

  // Route: Posts list with SWR
  const { data: posts, loading, stale, refetch: refetchPosts } = createResource<Post[]>(
    'posts',
    async (signal) => {
      const url = selectedAuthor.value
        ? `/api/posts?author=${selectedAuthor.value}`
        : '/api/posts';
      const res = await window.fetch(url, { signal });
      return res.json();
    },
    { 
      scope: 'route',           // ← Route-specific
      staleTime: 30000,         // 30 seconds
      revalidateOnFocus: true,  // Refetch on focus
      parse: (raw: any) => {
        // Transform dates
        return raw.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt)
        }));
      }
    }
  );

  // Manual operation: Create post
  const newTitle = ref('');
  const newContent = ref('');
  
  const { loading: creating, error: createError, refetch: createPost } = asyncOp(async () => {
    const res = await window.fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.value,
        content: newContent.value,
        author: currentUser.value?.name
      })
    });

    if (!res.ok) throw new Error('Failed to create post');

    // Clear form
    newTitle.value = '';
    newContent.value = '';

    // Invalidate posts cache
    await refetchPosts({ force: true });
  });

  // Manual operation: Delete post
  const { loading: deleting, refetch: deletePost } = asyncOp(async (postId: number) => {
    const res = await window.fetch(`/api/posts/${postId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Failed to delete post');

    // Invalidate posts cache
    await refetchPosts({ force: true });
  });

  // Watch for author filter changes
  watch(selectedAuthor, () => {
    refetchPosts({ force: true });
  });

  return (
    <div class="blog-app">
      {/* Current User (global scope) */}
      <header>
        <div>Logged in as: {currentUser.value?.name}</div>
      </header>

      {/* Create Post Form */}
      <section class="create-post">
        <h2>Create New Post</h2>
        <input
          type="text"
          placeholder="Title"
          value={newTitle.value}
          onInput={(e) => newTitle.value = (e.target as HTMLInputElement).value}
        />
        <textarea
          placeholder="Content"
          value={newContent.value}
          onInput={(e) => newContent.value = (e.target as HTMLTextAreaElement).value}
        />
        <button onClick={() => createPost()} disabled={creating.value}>
          {creating.value ? 'Creating...' : 'Publish'}
        </button>
        {createError.value && <div class="error">{createError.value}</div>}
      </section>

      {/* Filter */}
      <section class="filters">
        <select
          value={selectedAuthor.value || ''}
          onChange={(e) => selectedAuthor.value = (e.target as HTMLSelectElement).value || null}
        >
          <option value="">All Authors</option>
          <option value="john">John</option>
          <option value="jane">Jane</option>
        </select>

        <button onClick={() => refetchPosts({ force: true })}>
          🔄 Refresh
        </button>

        {stale.value && <span class="badge">Updating...</span>}
      </section>

      {/* Posts List */}
      <section class="posts">
        <When>
          {loading}
          {() => <div class="loading">Loading posts...</div>}
          
          {() => (
            <div>
              <p>Showing {posts.value?.length || 0} posts</p>
              <For each={posts}>
                {(post) => (
                  <article class="post">
                    <h3>{post.title}</h3>
                    <p class="meta">
                      by {post.author} on {post.createdAt.toLocaleDateString()}
                    </p>
                    <p>{post.content}</p>
                    
                    {currentUser.value?.name === post.author && (
                      <button 
                        onClick={() => deletePost(post.id)}
                        disabled={deleting.value}
                      >
                        Delete
                      </button>
                    )}
                  </article>
                )}
              </For>
            </div>
          )}
        </When>
      </section>
    </div>
  );
}
```

**Features demonstrated:**
- ✅ Global scope for user (persists across routes)
- ✅ Route scope for posts (route-specific)
- ✅ SWR with 30-second staleTime
- ✅ Focus revalidation
- ✅ Date parsing transformation
- ✅ Manual operations (create, delete)
- ✅ Cache invalidation after mutations
- ✅ Reactive filtering
- ✅ Loading and stale states
- ✅ Conditional rendering

## Key Takeaways

**Understanding the hierarchy:**
- `createResource()` is the foundation
- `fetch()` is a convenience wrapper for automatic loading
- `asyncOp()` is separate (no caching, manual only)

**The `scope` property is critical:**
- **`'global'`**: App-wide data, persists across routes, lives in memory
- **`'route'`**: Route-specific data, synced to router state, supports SSR

**Advanced features:**
- **Caching**: Automatic with deduplication by key
- **SWR**: Use `staleTime` for background revalidation
- **Focus revalidation**: Use `revalidateOnFocus` for fresh data
- **Transformation**: Use `parse` to transform responses
- **Manual control**: Use `refetch({ force: true })` to bypass cache

**Best practices:**
- Use same key across components to share data
- Choose `scope` based on data lifetime needs
- Set `staleTime` based on data freshness requirements
- Enable `revalidateOnFocus` for real-time-ish apps
- Always invalidate cache after mutations

**Next steps**: We've covered the complete data fetching story from manual approaches to advanced caching. In the next guide, we'll explore the router integration and how to build type-safe navigation with pre-loaded data.

> **What We've Learned**
>
> You now understand `createResource()` as the powerful primitive that powers Auwla's data management. You've learned the critical difference between `'global'` and `'route'` scopes, how to implement stale-while-revalidate patterns, and how to build sophisticated caching strategies with automatic deduplication and background revalidation. You can now build production-ready data layers with minimal boilerplate and maximum performance.
{style="note"}

