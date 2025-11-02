# Data Fetching: Loading Data in Reactive Applications

Modern web applications need to fetch data from APIs, display loading states, handle errors gracefully, and keep the UI responsive. In Auwla, data fetching integrates seamlessly with the reactive system, giving you precise control over when and how data loads.

This guide starts with the **manual approach using native fetch**, shows you the challenges, then introduces Auwla's helpers that solve these problems elegantly.

> **What You'll Learn**
>
> - Building data fetching manually with `ref` and native `fetch()`
> - Understanding loading states and error handling patterns
> - Handling reactive queries and search inputs
> - Understanding race conditions and how abort signals solve them
> - Using Auwla's `fetch()` helper for automatic request management
{style="note"}

## The Manual Approach: Building Your Own Fetch

Let's start by building data fetching from scratch using Auwla's reactive primitives and native `window.fetch`. This will help you understand what's happening under the hood.

<tabs>
<tab title="Basic Manual Fetch">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { onMount } from 'auwla';
import { When, For } from 'auwla';

type User = {
  id: number;
  name: string;
  email: string;
};

export function UserList() {
  // Create reactive refs for our state
  const data = ref<User[] | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch function
  const loadUsers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await window.fetch('/api/users');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const users = await response.json();
      data.value = users;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  // Fetch on mount
  onMount(() => {
    loadUsers();
  });

  return (
    <div>
      <h1>Users</h1>
      <button onClick={() => loadUsers()}>Refresh</button>
      
      <When>
        {loading}
        {() => <div class="loading">Loading users...</div>}
        
        {error}
        {() => <div class="error">Error: {error.value}</div>}
        
        {() => (
          <ul>
            <For each={data}>
              {(user) => (
                <li>
                  <strong>{user.name}</strong> - {user.email}
                </li>
              )}
            </For>
          </ul>
        )}
      </When>
    </div>
  );
}
```

**What's happening:**
1. Create `ref`s for `data`, `loading`, and `error` state
2. Define `loadUsers()` function that uses native `window.fetch()`
3. Update reactive state as the request progresses
4. Call `loadUsers()` on mount using `onMount()`
5. Render different UI states with the `When` component

</tab>
<tab title="Manual Fetch Pattern">

This is the standard pattern for manual data fetching:

```TypeScriptJSX
// 1. Create state refs
const data = ref<T | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// 2. Create fetch function
const fetchData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await window.fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data.value = await response.json();
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
};

// 3. Fetch on mount
onMount(() => {
  fetchData();
});

// 4. Use state in JSX
return (
  <When>
    {loading}
    {() => <div>Loading...</div>}
    {error}
    {() => <div>Error: {error.value}</div>}
    {() => <div>Data: {JSON.stringify(data.value)}</div>}
  </When>
);
```

This pattern gives you **full control** but requires **manual state management**.

</tab>
</tabs>

## Adding Reactive Queries

Now let's make the fetch reactive - it should re-run when a search query changes:

```TypeScriptJSX
import { h, ref, watch } from 'auwla';
import { onMount } from 'auwla';
import { When, For } from 'auwla';

type Product = { id: number; name: string; price: number };

export function ProductSearch() {
  const searchQuery = ref('');
  const data = ref<Product[] | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchProducts = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await window.fetch(
        `/api/products?search=${searchQuery.value}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      data.value = await response.json();
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  // Fetch on mount
  onMount(() => {
    fetchProducts();
  });

  // Re-fetch when search query changes
  watch(searchQuery, () => {
    fetchProducts();
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
      />
      
      <When>
        {loading}
        {() => <div>Searching...</div>}
        {() => (
          <For each={data}>
            {(product) => (
              <div class="product-card">
                <h3>{product.name}</h3>
                <p>${product.price}</p>
              </div>
            )}
          </For>
        )}
      </When>
    </div>
  );
}
```

**What happens:**
1. User types in search box → `searchQuery` changes
2. `watch` callback fires → calls `fetchProducts()`
3. New request goes out with updated query
4. Results update reactively

Great! But there's a **serious problem** lurking here...

## The Race Condition Problem

When a user types quickly, multiple requests are fired in rapid succession. But network requests don't complete in order!

<tabs>
<tab title="The Problem Visualized">

```
User types: "l" → "la" → "lap" → "lapt" → "lapto" → "laptop"

Timeline:
t=0ms:   Request 1 starts → /api/products?search=l
t=100ms: Request 2 starts → /api/products?search=la
t=200ms: Request 3 starts → /api/products?search=lap
t=300ms: Request 4 starts → /api/products?search=lapt
t=400ms: Request 5 starts → /api/products?search=lapto
t=500ms: Request 6 starts → /api/products?search=laptop

// But responses come back in unpredictable order!
t=600ms: Request 6 completes (laptop) ✅ Shows correct results
t=700ms: Request 3 completes (lap) ❌ OVERWRITES with wrong results!
t=800ms: Request 1 completes (l) ❌ OVERWRITES with very wrong results!
```

**Result**: You searched for "laptop" but see results for "l"!

**Why?** The last response to arrive wins, regardless of which query was most recent. This is called a **race condition**.

</tab>
<tab title="Real-World Impact">

Race conditions cause:
- ❌ Wrong search results displayed
- ❌ Outdated data overwriting fresh data
- ❌ Confusing user experience
- ❌ Hard-to-reproduce bugs

**The core issue**: Old requests keep running in the background and can overwrite newer results.

**The solution**: We need to **cancel old requests** when new ones start.

</tab>
</tabs>

## The Solution: Abort Signals

JavaScript provides `AbortController` to cancel fetch requests. Let's add it to our manual approach:

```TypeScriptJSX
import { h, ref, watch } from 'auwla';
import { onMount } from 'auwla';
import { When, For } from 'auwla';

type Product = { id: number; name: string; price: number };

export function ProductSearch() {
  const searchQuery = ref('');
  const data = ref<Product[] | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Track the current abort controller
  let currentController: AbortController | null = null;

  const fetchProducts = async () => {
    // Cancel any existing request
    if (currentController) {
      currentController.abort();
    }

    // Create new controller for this request
    currentController = new AbortController();
    const signal = currentController.signal;

    loading.value = true;
    error.value = null;

    try {
      const response = await window.fetch(
        `/api/products?search=${searchQuery.value}`,
        { signal } // ← Pass abort signal to fetch
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      data.value = await response.json();
    } catch (err) {
      // Ignore abort errors - they're expected
      if ((err as Error).name !== 'AbortError') {
        error.value = (err as Error).message;
      }
    } finally {
      loading.value = false;
    }
  };

  onMount(() => {
    fetchProducts();
  });

  watch(searchQuery, () => {
    fetchProducts();
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
      />
      
      <When>
        {loading}
        {() => <div>Searching...</div>}
        {() => (
          <For each={data}>
            {(product) => (
              <div class="product-card">
                <h3>{product.name}</h3>
                <p>${product.price}</p>
              </div>
            )}
          </For>
        )}
      </When>
    </div>
  );
}
```

**What changed:**
1. Track `currentController` to manage abort signals
2. On each fetch, **abort the previous request** if it exists
3. Create a **new AbortController** for this request
4. Pass the `signal` to `window.fetch()`
5. Ignore `AbortError` exceptions (they're expected)

**Result**: Old requests are cancelled when new ones start. No more race conditions! 🎉

## The Problem with Manual Fetching

While the manual approach works, notice how much boilerplate it requires:

```TypeScriptJSX
// ❌ Manual boilerplate for every fetch:
const data = ref<T | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
let currentController: AbortController | null = null;

const fetchData = async () => {
  if (currentController) currentController.abort();
  currentController = new AbortController();
  const signal = currentController.signal;
  
  loading.value = true;
  error.value = null;
  
  try {
    const response = await window.fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data.value = await response.json();
  } catch (err) {
    if (err.name !== 'AbortError') {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
};

onMount(() => fetchData());
```

**Issues:**
- Repetitive state setup for every fetch
- Manual abort controller management
- Easy to forget error handling or abort logic
- No built-in caching or optimization

This is where Auwla's helpers come in!

## Introducing Auwla's `fetch()` Helper

Auwla provides a `createFetch()` helper (imported as `fetch` from `'auwla'`) that handles all the boilerplate automatically:

<tabs>
<tab title="Using createFetch()">

```TypeScriptJSX
import { h } from 'auwla';
import { fetch as createFetch } from 'auwla'; // Import as createFetch for clarity
import { When, For } from 'auwla';

type User = {
  id: number;
  name: string;
  email: string;
};

export function UserList() {
  // All the boilerplate is handled automatically!
  const { data, loading, error, refetch } = createFetch<User[]>('/api/users');

  return (
    <div>
      <h1>Users</h1>
      <button onClick={() => refetch()}>Refresh</button>
      
      <When>
        {loading}
        {() => <div class="loading">Loading users...</div>}
        
        {error}
        {() => <div class="error">Error: {error.value}</div>}
        
        {() => (
          <ul>
            <For each={data}>
              {(user) => (
                <li>
                  <strong>{user.name}</strong> - {user.email}
                </li>
              )}
            </For>
          </ul>
        )}
      </When>
    </div>
  );
}
```

**What you get automatically:**
- ✅ Reactive `data`, `loading`, `error` refs
- ✅ Automatic fetch on mount
- ✅ `refetch()` function to reload data
- ✅ **Automatic abort signal management** (race condition prevention)
- ✅ Built-in error handling
- ✅ Optional caching support

</tab>
<tab title="The Return Values">

```TypeScriptJSX
const { data, loading, error, refetch } = createFetch<User[]>('/api/users');
```

**What you get:**

- **`data`**: `Ref<User[] | null>` - The fetched data, `null` until loaded
- **`loading`**: `Ref<boolean>` - `true` while request is in progress
- **`error`**: `Ref<string | null>` - Error message if request fails
- **`refetch`**: `() => Promise<void>` - Function to reload the data

All are reactive refs! Use them directly in JSX or with `watch`/`derive`.

</tab>
<tab title="Under the Hood">

Auwla's `fetch()` helper uses Auwla's `createResource()` utility, which automatically:

1. **Manages abort controllers** for you
2. **Cancels previous requests** when `refetch()` is called
3. **Ignores responses from aborted requests**
4. **Handles the fetch lifecycle** (loading, error, success)

```TypeScriptJSX
// Simplified view of what happens internally
export function fetch<T>(url: string | (() => string)) {
  const resource = createResource<T>('cache-key', async (signal) => {
    // ← signal is provided automatically by createResource!
    const urlString = typeof url === 'function' ? url() : url;
    
    // Pass signal to native fetch
    const response = await window.fetch(urlString, { signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch
  };
}
```

**Key insight**: `createResource()` automatically provides an `AbortSignal` to your fetcher function and manages the abort controller lifecycle for you!

</tab>
</tabs>

## Reactive Search with createFetch()

Now let's rebuild our search example using `createFetch()`:

```TypeScriptJSX
import { h, ref, watch } from 'auwla';
import { fetch as createFetch } from 'auwla';
import { When, For } from 'auwla';

type Product = { id: number; name: string; price: number };

export function ProductSearch() {
  const searchQuery = ref('');

  // Dynamic URL function that uses current searchQuery value
  const { data, loading, error, refetch } = createFetch<Product[]>(
    () => `/api/products?search=${searchQuery.value}`
  );

  // Re-fetch when query changes
  watch(searchQuery, () => {
    refetch(); // ← Automatically cancels previous request!
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
      />
      
      <When>
        {loading}
        {() => <div class="spinner">Searching...</div>}
        {() => (
          <div>
            <p>Found {data.value?.length || 0} products</p>
            <For each={data}>
              {(product) => (
                <div class="product-card">
                  <h3>{product.name}</h3>
                  <p>${product.price}</p>
                </div>
              )}
            </For>
          </div>
        )}
      </When>
    </div>
  );
}
```

**Compare to manual approach:**
- ❌ 40+ lines of boilerplate → ✅ 10 lines with `createFetch()`
- ❌ Manual abort controller → ✅ Automatic cancellation
- ❌ Manual state refs → ✅ Returned automatically
- ❌ Manual error handling → ✅ Built-in

**And it's race-condition safe!** Old requests are automatically cancelled.

## Caching with createFetch()

You can optionally cache fetch results using a cache key:

```TypeScriptJSX
import { fetch as createFetch } from 'auwla';

// Cache results with a key
const { data, loading, error } = createFetch<User[]>(
  '/api/users',
  { cacheKey: 'users' }
);
```

**Benefits:**
- First load fetches from API
- Subsequent mounts use cached data instantly
- Manual `refetch()` updates the cache
- Cache can be route-scoped or global

## Real-World Example: Complete Search Component

Let's build a production-ready search component with all best practices:

```TypeScriptJSX
import { h, ref, watch, derive } from 'auwla';
import { fetch as createFetch } from 'auwla';
import { When, For } from 'auwla';

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
};

export function ProductSearch() {
  const searchQuery = ref('');
  const category = ref<string>('all');

  // Fetch products based on search and category
  const { data, loading, error, refetch } = createFetch<Product[]>(() => {
    const params = new URLSearchParams();
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (category.value !== 'all') params.append('category', category.value);
    return `/api/products?${params.toString()}`;
  });

  // Refetch when search or category changes
  watch([searchQuery, category], () => {
    refetch();
  });

  // Derive some useful computed values
  const resultCount = derive(data, (products) => products?.length || 0);
  const isEmpty = derive([data, loading], ([products, isLoading]) => 
    !isLoading && (!products || products.length === 0)
  );

  return (
    <div class="product-search">
      <div class="search-controls">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery.value}
          onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
        />
        
        <select
          value={category.value}
          onChange={(e) => category.value = (e.target as HTMLSelectElement).value}
        >
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>

        <button onClick={() => refetch()}>🔄 Refresh</button>
      </div>

      <When>
        {loading}
        {() => (
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Searching products...</p>
          </div>
        )}

        {error}
        {() => (
          <div class="error-state">
            <p>⚠️ Error loading products: {error.value}</p>
            <button onClick={() => refetch()}>Try Again</button>
          </div>
        )}

        {isEmpty}
        {() => (
          <div class="empty-state">
            <p>No products found matching your criteria.</p>
            <button onClick={() => {
              searchQuery.value = '';
              category.value = 'all';
            }}>
              Clear Filters
            </button>
          </div>
        )}

        {() => (
          <div class="results">
            <p class="result-count">
              Found {resultCount} product{watch(resultCount, c => c !== 1 ? 's' : '')}
            </p>
            
            <div class="product-grid">
              <For each={data} key={(product) => product.id}>
                {(product) => (
                  <div class="product-card">
                    <h3>{product.name}</h3>
                    <p class="description">{product.description}</p>
                    <div class="product-footer">
                      <span class="category">{product.category}</span>
                      <span class="price">${product.price}</span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </When>
    </div>
  );
}
```

**Features:**
- ✅ Reactive search with query and category filters
- ✅ Automatic request cancellation (no race conditions)
- ✅ Loading, error, empty, and success states
- ✅ Derived computed values (result count, isEmpty check)
- ✅ Manual refresh button
- ✅ Clear filters functionality
- ✅ Efficient list rendering with `For` component

## Adding Debouncing

Sometimes you want to wait until the user stops typing before fetching:

```TypeScriptJSX
import { h, ref, watch } from 'auwla';
import { fetch as createFetch } from 'auwla';

export function ProductSearch() {
  const searchQuery = ref('');
  const debouncedQuery = ref('');

  const { data, loading, error, refetch } = createFetch<Product[]>(
    () => `/api/products?search=${debouncedQuery.value}`
  );

  // Debounce: wait 300ms after user stops typing
  let debounceTimer: number | null = null;
  watch(searchQuery, (query) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      debouncedQuery.value = query;
      refetch();
    }, 300) as unknown as number;
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={searchQuery.value}
        onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
      />
      
      {watch(loading, (isLoading) =>
        isLoading ? <span class="typing-indicator">Searching...</span> : null
      )}
      
      <For each={data}>
        {(product) => <div>{product.name}</div>}
      </For>
    </div>
  );
}
```

**Benefits:**
- Reduces API calls significantly
- Better user experience (no flashing on every keystroke)
- Server load reduction

## Key Takeaways

**Start with the manual approach to understand the foundation**:
- Use `ref` to track `data`, `loading`, and `error`
- Call native `window.fetch()` in an async function
- Update state as the request progresses
- Use `onMount()` to fetch on component mount

**Race conditions are real and dangerous**:
- Multiple quick requests can complete in any order
- The last response wins, even if it's from an old query
- Use `AbortController` to cancel old requests
- Pass the `signal` to `window.fetch()`

**Auwla's `createFetch()` helper eliminates boilerplate**:
- Automatically manages state refs
- Automatically fetches on mount
- **Automatically handles abort signals via `createResource()`**
- Returns `{ data, loading, error, refetch }`

**Under the hood: `createResource()` provides the magic**:
- Automatically creates and manages `AbortController`
- Passes `signal` to your fetcher function
- Cancels previous requests on `refetch()`
- Ignores responses from aborted requests

**Next steps**: We've covered data fetching and reactive queries. In the next guide, we'll explore manual operations (forms, buttons) with `asyncOp()` and advanced caching strategies with `createResource()`.

> **What We've Learned**
>
> You now understand how to fetch data both manually and with Auwla's helpers. You've seen how race conditions occur and how abort signals prevent them. The `createFetch()` helper (which uses `createResource()` under the hood) automatically manages abort controllers, eliminating boilerplate while keeping you safe from race conditions.
