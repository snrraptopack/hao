# Routing: Building Type-Safe Single Page Applications

Auwla's routing system is built on two layers: a **high-level declarative API** for defining routes, and a low-level router for execution. This guide focuses on the high-level API that you'll use daily to build SPAs.

The routing API provides powerful composition tools: `defineRoutes()` for creating route arrays, `group()` for organizing routes with shared behavior, `composeRoutes()` for combining route sets, and `pathFor()` for building URLs.

> **What You'll Learn**
>
> - Defining routes with `defineRoutes()` for type-safe route arrays
> - Organizing routes with `group()` for shared guards and layouts
> - Combining route sets with `composeRoutes()`
> - Building URLs with `pathFor()` and navigation patterns
> - Route guards, layouts, and lifecycle hooks
> - Dynamic parameters and query strings
> - SEO meta tags and prefetching strategies
{style="note"}

## Part 1: Defining Routes with `defineRoutes()`

The foundation of Auwla's routing is `defineRoutes()`, which creates type-safe route arrays:

```TypeScriptJSX
import { h } from 'auwla';
import { defineRoutes } from 'auwla';

// Define your page components
function HomePage() {
  return <div><h1>Welcome Home</h1></div>;
}

function AboutPage() {
  return <div><h1>About Us</h1></div>;
}

function ProductsPage() {
  return <div><h1>Our Products</h1></div>;
}

// Define routes with full type safety
const routes = defineRoutes([
  { 
    path: '/', 
    component: () => HomePage(),
    name: 'home'
  },
  { 
    path: '/about', 
    component: () => AboutPage(),
    name: 'about'
  },
  { 
    path: '/products', 
    component: () => ProductsPage(),
    name: 'products'
  },
]);

export { routes };
```

**What `defineRoutes()` does:**
- ✅ Preserves literal path types for TypeScript inference
- ✅ Ensures type safety for parameters
- ✅ Returns a readonly array that can be passed to the Router
- ✅ Enables autocomplete for route names

### Route Object Structure

Each route object has the following shape:

```TypeScript
{
  path: string | RegExp;              // Route pattern (e.g., '/users/:id')
  component: (params, query) => HTMLElement;  // Component function
  name?: string;                      // Optional unique route name
  guard?: RouteGuard;                 // Optional navigation guard
  layout?: (child, params, query) => HTMLElement;  // Optional layout wrapper
  routed?: (state, params, prev) => void | (() => void);  // Lifecycle hook
  paramDecoders?: Record<string, ParamDecoder>;  // Type converters for params
  prefetch?: (params, query, router) => void | Promise<void>;  // Prefetch hook
  meta?: MetaConfig;                  // SEO meta tags
}
```

Don't worry - we'll cover each of these options in detail throughout this guide.

## Part 2: Dynamic Routes with Parameters

Routes can include dynamic segments using `:paramName` syntax:

```TypeScriptJSX
import { h } from 'auwla';
import { defineRoutes } from 'auwla';
import { createResource } from 'auwla';
import { When } from 'auwla';

type Product = { id: number; name: string; price: number };

function ProductPage(params: { id: string }) {
  const { data, loading } = createResource<Product>(
    `product:${params.id}`,
    async (signal) => {
      const res = await window.fetch(`/api/products/${params.id}`, { signal });
      return res.json();
    },
    { scope: 'route' }
  );

  return (
    <When>
      {loading}
      {() => <div>Loading product...</div>}
      {() => (
        <div>
          <h1>{data.value?.name}</h1>
          <p>${data.value?.price}</p>
        </div>
      )}
    </When>
  );
}

const routes = defineRoutes([
  { path: '/', component: () => HomePage() },
  { 
    path: '/products/:id', 
    component: (params) => ProductPage(params!),
    name: 'product-detail'
  },
]);
```

**Key points about parameters:**
- Parameters are captured from the URL (e.g., `/products/123` → `{ id: '123' }`)
- All parameters are **strings by default** (you need to parse numbers)
- Multiple parameters work: `/users/:userId/posts/:postId`
- Parameters are passed as the first argument to the component function

### Type-Safe Parameter Conversion with `paramDecoders`

Instead of manually parsing parameters, use decoders:

```TypeScriptJSX
import { defineRoutes } from 'auwla';

function ProductPage(params: { id: number }) {
  // params.id is now a NUMBER, not a string!
  console.log(typeof params.id); // "number"
  
  return <div>Product #{params.id}</div>;
}

const routes = defineRoutes([
  { 
    path: '/products/:id', 
    component: (params) => ProductPage(params!),
    paramDecoders: {
      id: 'number'  // ← Automatically converts string to number
    }
  },
]);
```

**Available decoders:**
- `'string'` - Keep as string (default, no conversion)
- `'number'` - Convert to number with `Number()`
- Custom function: `(raw: string) => any` - Your own conversion logic

**Custom decoder example:**

```TypeScriptJSX
const routes = defineRoutes([
  { 
    path: '/users/:id', 
    component: (params) => UserPage(params!),
    paramDecoders: {
      id: (raw) => {
        const num = parseInt(raw, 10);
        if (isNaN(num) || num <= 0) {
          throw new Error('Invalid user ID');
        }
        return num;
      }
    }
  },
]);
```

## Part 3: Organizing Routes with `group()`

As your application grows, you'll want to organize related routes together. The `group()` function prefixes paths and applies shared configuration:

```TypeScriptJSX
import { h } from 'auwla';
import { defineRoutes, group } from 'auwla';

// Admin page components
function AdminHome() {
  return <div><h1>Admin Dashboard</h1></div>;
}

function AdminUsers() {
  return <div><h1>Manage Users</h1></div>;
}

function AdminSettings() {
  return <div><h1>Admin Settings</h1></div>;
}

// Define admin routes
const adminRoutes = defineRoutes([
  { path: '/', component: () => AdminHome(), name: 'admin-home' },
  { path: '/users', component: () => AdminUsers(), name: 'admin-users' },
  { path: '/settings', component: () => AdminSettings(), name: 'admin-settings' },
]);

// Group under /admin prefix
const groupedAdminRoutes = group('/admin', {}, adminRoutes);

// Result: All paths are prefixed
// '/' becomes '/admin'
// '/users' becomes '/admin/users'
// '/settings' becomes '/admin/settings'
```

**What `group()` does:**
- ✅ Prefixes all child route paths with the base path
- ✅ Maintains full type safety for paths
- ✅ Optionally applies shared guards or layouts
- ✅ Keeps your route definitions organized and DRY

### Group with Shared Guards

Apply authentication or authorization checks to all routes in a group:

```TypeScriptJSX
import { ref } from 'auwla';
import { defineRoutes, group } from 'auwla';

// Auth state
const currentUser = ref<User | null>(null);

// Guard function
const isAdmin = (to, from) => {
  if (!currentUser.value?.isAdmin) {
    console.warn('Not authorized');
    return false;
  }
  return true;
};

// Admin routes protected by guard
const adminRoutes = defineRoutes([
  { path: '/', component: () => AdminHome() },
  { path: '/users', component: () => AdminUsers() },
  { path: '/settings', component: () => AdminSettings() },
]);

const protectedAdminRoutes = group('/admin', {
  guard: isAdmin  // ← Applied to ALL routes in this group
}, adminRoutes);

// Now all admin routes require admin role
```

**Guard function signature:**

```TypeScript
type RouteGuard = (
  to: RouteMatch,      // Where the user is trying to go
  from: RouteMatch | null  // Where they're coming from (or null)
) => boolean | Promise<boolean>;  // Return false to block navigation
```

**Guard behavior:**
- Runs **before** the component is created
- Can be async (return `Promise<boolean>`)
- Return `false` to block navigation
- Use for authentication, authorization, validation

### Group with Shared Layouts

Apply a common layout wrapper to all routes in a group:

```TypeScriptJSX
import { h } from 'auwla';
import { defineRoutes, group } from 'auwla';
import { Link } from 'auwla';

// Layout component that wraps children
function DashboardLayout(child: HTMLElement) {
  return (
    <div class="dashboard-layout">
      <aside class="sidebar">
        <nav>
          <Link to="/dashboard" text="Overview" activeClassName="active" />
          <Link to="/dashboard/analytics" text="Analytics" activeClassName="active" />
          <Link to="/dashboard/reports" text="Reports" activeClassName="active" />
          <Link to="/dashboard/settings" text="Settings" activeClassName="active" />
        </nav>
      </aside>
      
      <main class="content">
        {child}  {/* Child route renders here */}
      </main>
    </div>
  );
}

// Dashboard routes
const dashboardRoutes = defineRoutes([
  { path: '/', component: () => <h1>Dashboard Overview</h1> },
  { path: '/analytics', component: () => <h1>Analytics</h1> },
  { path: '/reports', component: () => <h1>Reports</h1> },
  { path: '/settings', component: () => <h1>Settings</h1> },
]);

// Apply shared layout to all dashboard routes
const layoutedDashboardRoutes = group('/dashboard', {
  layout: DashboardLayout  // ← Wraps every route's component
}, dashboardRoutes);
```

**Layout function signature:**

```TypeScript
type LayoutFn = (
  child: HTMLElement,           // The route's component
  params?: RouteParams,         // Current route parameters
  query?: QueryParams           // Current query parameters
) => HTMLElement;               // Return the wrapped element
```

**Layout with parameters:**

```TypeScriptJSX
function UserLayout(child: HTMLElement, params: { userId: string }) {
  const userId = params.userId;
  
  return (
    <div class="user-layout">
      <header>
        <h2>User: {userId}</h2>
      </header>
      <nav>
        <Link to={`/users/${userId}/profile`} text="Profile" />
        <Link to={`/users/${userId}/posts`} text="Posts" />
        <Link to={`/users/${userId}/settings`} text="Settings" />
      </nav>
      <main>{child}</main>
    </div>
  );
}

const userRoutes = defineRoutes([
  { path: '/profile', component: () => <div>Profile Page</div> },
  { path: '/posts', component: () => <div>Posts Page</div> },
  { path: '/settings', component: () => <div>Settings Page</div> },
]);

const layoutedUserRoutes = group('/users/:userId', {
  layout: (child, params) => UserLayout(child, params!)
}, userRoutes);

// Results in routes:
// /users/:userId/profile
// /users/:userId/posts  
// /users/:userId/settings
// All wrapped in UserLayout with access to userId
```

## Part 4: Combining Routes with `composeRoutes()`

As your application grows, you'll define routes in separate files. Use `composeRoutes()` to combine them:

```TypeScriptJSX
// routes/public.ts
import { defineRoutes } from 'auwla';

export const publicRoutes = defineRoutes([
  { path: '/', component: () => HomePage(), name: 'home' },
  { path: '/about', component: () => AboutPage(), name: 'about' },
  { path: '/products', component: () => ProductsPage(), name: 'products' },
]);

// routes/auth.ts
import { defineRoutes } from 'auwla';

export const authRoutes = defineRoutes([
  { path: '/login', component: () => LoginPage(), name: 'login' },
  { path: '/register', component: () => RegisterPage(), name: 'register' },
  { path: '/forgot-password', component: () => ForgotPasswordPage() },
]);

// routes/admin.ts
import { defineRoutes, group } from 'auwla';

const adminPages = defineRoutes([
  { path: '/', component: () => AdminHome() },
  { path: '/users', component: () => AdminUsers() },
  { path: '/settings', component: () => AdminSettings() },
]);

export const adminRoutes = group('/admin', {
  guard: isAdminGuard,
  layout: AdminLayout
}, adminPages);

// routes/index.ts
import { composeRoutes } from 'auwla';
import { publicRoutes } from './public';
import { authRoutes } from './auth';
import { adminRoutes } from './admin';

// Combine all route sets into one array
export const routes = composeRoutes(
  publicRoutes,
  authRoutes,
  adminRoutes
);

// Type safety is preserved!
// You get autocomplete for all route names across all sets
```

**Benefits of `composeRoutes()`:**
- ✅ Organize routes by feature/domain
- ✅ Keep route files focused and maintainable
- ✅ Full type safety across all composed routes
- ✅ Easy to add/remove entire feature sets

## Part 5: Building URLs with `pathFor()`

Once routes are defined, you need to build URLs to navigate. The `pathFor()` function provides type-safe URL building:

```TypeScriptJSX
import { pathFor } from 'auwla';

// Basic usage - replace parameters
const userUrl = pathFor('/users/:id', { id: 123 });
// Result: "/users/123"

const postUrl = pathFor('/users/:userId/posts/:postId', { 
  userId: 5, 
  postId: 42 
});
// Result: "/users/5/posts/42"
```

**Adding query parameters:**

```TypeScriptJSX
import { pathFor } from 'auwla';

// Add query string
const searchUrl = pathFor('/search', {}, { 
  q: 'laptop', 
  sort: 'price',
  page: 2
});
// Result: "/search?q=laptop&sort=price&page=2"

// Combine params and query
const userPostsUrl = pathFor('/users/:id/posts', { id: 123 }, {
  tab: 'recent',
  page: 1
});
// Result: "/users/123/posts?tab=recent&page=1"
```

**Using `pathFor()` in components:**

```TypeScriptJSX
import { h } from 'auwla';
import { pathFor } from 'auwla';
import { Link } from 'auwla';

function ProductCard({ product }: { product: Product }) {
  const productUrl = pathFor('/products/:id', { id: product.id });
  
  return (
    <div class="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <Link to={productUrl} text="View Details" />
    </div>
  );
}

// Even better: use Link's built-in params support
function ProductCard({ product }: { product: Product }) {
  return (
    <div class="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <Link 
        to="/products/:id" 
        params={{ id: product.id }}
        text="View Details"
      />
    </div>
  );
}
```

**`pathFor()` signature:**

```TypeScriptJSX
function pathFor<P extends string>(
  pattern: P,                      // Route pattern with :params
  params: PathParams<P>,           // Object with parameter values
  query?: Record<string, string | number>  // Optional query parameters
): string;                         // Returns the built URL string
```

## Part 6: The `Link` Component

For declarative navigation, use the `Link` component:

```TypeScriptJSX
import { h } from 'auwla';
import { Link } from 'auwla';

function Navigation() {
  return (
    <nav>
      <Link 
        to="/" 
        text="Home"
        className="nav-link"
        activeClassName="active"
      />
      
      <Link 
        to="/products" 
        text="Products"
        className="nav-link"
        activeClassName="active"
      />
      
      <Link 
        to="/about" 
        text="About"
        className="nav-link"
        activeClassName="active"
      />
    </nav>
  );
}
```

**Link with parameters:**

```TypeScriptJSX
<Link
  to="/products/:id"
  params={{ id: product.id }}
  text="View Product"
  className="btn"
/>
```

**Link with query strings:**

```TypeScriptJSX
<Link
  to="/search"
  query={{ q: searchTerm, page: currentPage }}
  text="Search"
/>
```

**Active state:**
- `activeClassName` is automatically applied when the route matches
- Perfect for navigation menus
- Reactive - updates as route changes

### Link Prefetching

Preload route data for instant transitions:

```TypeScriptJSX
// Prefetch on hover
<Link
  to="/products/:id"
  params={{ id: product.id }}
  text="View Details"
  prefetch="hover"
/>

// Prefetch when visible in viewport
<Link
  to="/products/:id"
  params={{ id: product.id }}
  text="View Details"
  prefetch="visible"
/>
```

**How prefetching works:**
1. User hovers (or link becomes visible)
2. Route's `prefetch` hook is called
3. Data loads in background
4. When user clicks, data is already cached!

**Define prefetch hooks in routes:**

```TypeScriptJSX
const routes = defineRoutes([
  { 
    path: '/products/:id', 
    component: (params) => ProductPage(params!),
    name: 'product-detail',
    prefetch: async (params, query, router) => {
      // Prefetch product data
      const res = await window.fetch(`/api/products/${params!.id}`);
      const product = await res.json();
      
      // Cache in router state
      router!.state[`product:${params!.id}`] = product;
    }
  },
]);
```

## Summary

**The routing API in 5 steps:**

1. **`defineRoutes()`** - Create type-safe route arrays
2. **`group()`** - Organize routes with shared behavior (guards, layouts)
3. **`composeRoutes()`** - Combine route sets from different files
4. **`pathFor()`** - Build URLs with type safety
5. **`Link`** - Navigate declaratively with active states and prefetching

This high-level API gives you everything you need to build production-ready SPAs without touching the low-level Router class internals.

## Part 7: Programmatic Navigation and Hooks

Beyond declarative navigation with `Link`, Auwla provides hooks and methods for programmatic navigation and accessing route data.

### The `useRouter()` Hook

Access the router instance inside any component:

```TypeScriptJSX
import { h } from 'auwla';
import { useRouter } from 'auwla';

function NavigationButtons() {
  const router = useRouter();

  return (
    <div>
      <button onClick={() => router.push('/products')}>
        Go to Products
      </button>
      
      <button onClick={() => router.back()}>
        Go Back
      </button>
      
      <button onClick={() => router.forward()}>
        Go Forward
      </button>
    </div>
  );
}
```

**Available methods on the router:**

```TypeScriptJSX
const router = useRouter();

// Push new route (adds to history)
router.push('/products');
router.push('/products/123');
router.push('/search?q=laptop&page=2');

// Replace current route (replaces history entry)
router.replace('/login');

// Navigate back/forward
router.back();
router.forward();

// Check if a path is active
const isActive = router.isActive('/products'); // boolean

// Access router state cache
const cachedData = router.state['some-key'];
router.clearCache(); // Clear all cache
router.clearCacheKey('some-key'); // Clear specific key
```

### Named Route Navigation with `pushNamed()`

When you define routes with names, you can navigate using `pushNamed()` for type-safe navigation:

```TypeScriptJSX
import { h } from 'auwla';
import { defineRoutes } from 'auwla';
import { useRouter } from 'auwla';

// Define routes with names
const routes = defineRoutes([
  { 
    path: '/', 
    component: () => HomePage(), 
    name: 'home' 
  },
  { 
    path: '/products/:id', 
    component: (params) => ProductPage(params!),
    name: 'product-detail'
  },
  { 
    path: '/users/:userId/posts/:postId', 
    component: (params) => PostPage(params!),
    name: 'user-post'
  },
]);

// Navigate by name with type-safe parameters
function ProductCard({ product }: { product: Product }) {
  const router = useRouter();

  const handleClick = () => {
    // TypeScript knows you need an 'id' parameter!
    router.pushNamed('product-detail', { id: product.id });
  };

  return (
    <div class="product-card" onClick={handleClick}>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
}

// Navigate to nested routes
function UserPostLink({ userId, postId }: { userId: number; postId: number }) {
  const router = useRouter();

  return (
    <button onClick={() => router.pushNamed('user-post', { userId, postId })}>
      View Post
    </button>
  );
}
```

**Benefits of `pushNamed()`:**
- ✅ Type-safe parameters (TypeScript knows what params you need)
- ✅ Autocomplete for route names
- ✅ Refactor paths without breaking navigation
- ✅ Compile-time errors if you miss required parameters

**Building URLs from named routes:**

```TypeScriptJSX
const router = useRouter();

// Build a URL without navigating
const productUrl = router.pathForNamed('product-detail', { id: 123 });
// Result: "/products/123"

// With query parameters
const searchUrl = router.pathForNamed('search', {}, { q: 'laptop', page: 2 });
// Result: "/search?q=laptop&page=2"
```

### The `useParams()` Hook

Access route parameters reactively without passing them through component props:

```TypeScriptJSX
import { h } from 'auwla';
import { useParams } from 'auwla';
import { createResource } from 'auwla';

function ProductPage() {
  // Get params reactively
  const params = useParams();
  
  // Access parameter values
  const productId = params.value.id;

  const { data, loading } = createResource<Product>(
    `product:${productId}`,
    async (signal) => {
      const res = await window.fetch(`/api/products/${productId}`, { signal });
      return res.json();
    },
    { scope: 'route' }
  );

  return (
    <div>
      <h1>Product ID: {productId}</h1>
      {loading.value ? <p>Loading...</p> : <p>{data.value?.name}</p>}
    </div>
  );
}
```

**Key points about `useParams()`:**
- Returns a `Ref<RouteParams>` - it's reactive!
- All parameters are strings by default (unless you use `paramDecoders`)
- Access values with `.value` property
- Updates automatically when route changes

**Using params reactively:**

```TypeScriptJSX
import { h, watch } from 'auwla';
import { useParams } from 'auwla';

function UserProfile() {
  const params = useParams();

  // React to parameter changes
  watch(() => params.value.userId, (newUserId, oldUserId) => {
    console.log(`User changed from ${oldUserId} to ${newUserId}`);
    // Trigger side effects here
  });

  return <div>User: {params.value.userId}</div>;
}
```

### The `useQuery()` Hook

Access URL query parameters reactively:

```TypeScriptJSX
import { h } from 'auwla';
import { useQuery, useRouter } from 'auwla';

function SearchPage() {
  const query = useQuery();
  const router = useRouter();

  // Access query parameters
  const searchTerm = query.value.q || '';
  const page = parseInt(query.value.page || '1', 10);
  const sortBy = query.value.sort || 'relevance';

  const handlePageChange = (newPage: number) => {
    // Update query parameters
    router.push(`/search?q=${searchTerm}&page=${newPage}&sort=${sortBy}`);
  };

  const handleSortChange = (newSort: string) => {
    router.push(`/search?q=${searchTerm}&page=${page}&sort=${newSort}`);
  };

  return (
    <div class="search-page">
      <h1>Search: {searchTerm}</h1>
      <p>Page {page}</p>
      
      <select value={sortBy} onChange={(e) => handleSortChange((e.target as HTMLSelectElement).value)}>
        <option value="relevance">Relevance</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="newest">Newest First</option>
      </select>

      {/* Search results here */}

      <div class="pagination">
        {page > 1 && (
          <button onClick={() => handlePageChange(page - 1)}>
            ← Previous
          </button>
        )}
        <span>Page {page}</span>
        <button onClick={() => handlePageChange(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}
```

**Key points about `useQuery()`:**
- Returns a `Ref<QueryParams>` - it's reactive!
- All values are strings (parse numbers/booleans manually)
- Updates automatically when URL query changes
- Access values with `.value` property

**Query parameter best practices:**

```TypeScriptJSX
import { h, watch } from 'auwla';
import { useQuery } from 'auwla';
import { createResource } from 'auwla';

function ProductsPage() {
  const query = useQuery();

  // Parse query parameters with defaults
  const page = parseInt(query.value.page || '1', 10);
  const limit = parseInt(query.value.limit || '20', 10);
  const category = query.value.category || 'all';
  const sortBy = query.value.sort || 'name';

  // Fetch data based on query parameters
  const { data, loading } = createResource<Product[]>(
    `products:${page}:${limit}:${category}:${sortBy}`,
    async (signal) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        category,
        sort: sortBy
      });
      
      const res = await window.fetch(`/api/products?${params}`, { signal });
      return res.json();
    },
    { scope: 'route' }
  );

  // Watch for query changes and refetch
  watch(query, () => {
    console.log('Query parameters changed:', query.value);
  });

  return (
    <div>
      <h1>Products - {category}</h1>
      <p>Page {page} of results</p>
      {/* Render products */}
    </div>
  );
}
```

### Complete Example: Combining All Navigation Patterns

Here's a real-world example using all the navigation and hooks together:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { defineRoutes, group, composeRoutes } from 'auwla';
import { useRouter, useParams, useQuery, Link } from 'auwla';
import { createResource } from 'auwla';
import { When, For } from 'auwla';

// Types
type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
};

// Products List Page
function ProductsPage() {
  const router = useRouter();
  const query = useQuery();

  // Parse query parameters
  const page = parseInt(query.value.page || '1', 10);
  const category = query.value.category || 'all';
  const sort = query.value.sort || 'name';

  // Fetch products with query-based cache key
  const { data: products, loading } = createResource<Product[]>(
    `products:${category}:${sort}:${page}`,
    async (signal) => {
      const params = new URLSearchParams({
        page: String(page),
        category,
        sort
      });
      const res = await window.fetch(`/api/products?${params}`, { signal });
      return res.json();
    },
    { scope: 'route', staleTime: 30000 }
  );

  // Navigation helpers
  const updateQuery = (updates: Record<string, string | number>) => {
    const newQuery = { ...query.value, ...updates };
    const params = new URLSearchParams(
      Object.entries(newQuery).map(([k, v]) => [k, String(v)])
    );
    router.push(`/products?${params}`);
  };

  return (
    <div class="products-page">
      <h1>Products</h1>

      {/* Filters */}
      <div class="filters">
        <select 
          value={category}
          onChange={(e) => updateQuery({ category: (e.target as HTMLSelectElement).value, page: 1 })}
        >
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>

        <select 
          value={sort}
          onChange={(e) => updateQuery({ sort: (e.target as HTMLSelectElement).value })}
        >
          <option value="name">Name</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {/* Product Grid */}
      <When>
        {loading}
        {() => <div class="loading">Loading products...</div>}
        {() => (
          <div>
            <div class="product-grid">
              <For each={products}>
                {(product) => (
                  <div class="product-card">
                    <h3>{product.name}</h3>
                    <p>${product.price}</p>
                    
                    {/* Declarative navigation with Link */}
                    <Link
                      to="/products/:id"
                      params={{ id: product.id }}
                      text="View Details"
                      className="btn"
                      prefetch="hover"
                    />
                    
                    {/* Or programmatic navigation */}
                    <button onClick={() => router.pushNamed('product-detail', { id: product.id })}>
                      Quick View
                    </button>
                  </div>
                )}
              </For>
            </div>

            {/* Pagination */}
            <div class="pagination">
              {page > 1 && (
                <button onClick={() => updateQuery({ page: page - 1 })}>
                  ← Previous
                </button>
              )}
              <span>Page {page}</span>
              <button onClick={() => updateQuery({ page: page + 1 })}>
                Next →
              </button>
            </div>
          </div>
        )}
      </When>
    </div>
  );
}

// Product Detail Page
function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // Access parameter directly from hook
  const productId = params.value.id;

  const { data: product, loading, error } = createResource<Product>(
    `product:${productId}`,
    async (signal) => {
      const res = await window.fetch(`/api/products/${productId}`, { signal });
      return res.json();
    },
    { scope: 'route' }
  );

  const handleAddToCart = () => {
    // Add to cart logic...
    
    // Navigate to cart
    router.push('/cart');
  };

  const handleBackToProducts = () => {
    // Go back to previous page
    router.back();
  };

  return (
    <When>
      {loading}
      {() => <div class="loading">Loading...</div>}
      
      {error}
      {() => (
        <div class="error">
          <p>Product not found</p>
          <button onClick={handleBackToProducts}>← Back to Products</button>
        </div>
      )}
      
      {() => (
        <div class="product-detail">
          <button onClick={handleBackToProducts} class="back-btn">
            ← Back
          </button>

          <h1>{product.value!.name}</h1>
          <p class="price">${product.value!.price}</p>
          <p class="category">Category: {product.value!.category}</p>

          <button onClick={handleAddToCart} class="btn-primary">
            Add to Cart
          </button>

          {/* Link to related products */}
          <Link
            to="/products"
            query={{ category: product.value!.category }}
            text={`More in ${product.value!.category}`}
            className="related-link"
          />
        </div>
      )}
    </When>
  );
}

// Define routes
const routes = defineRoutes([
  { 
    path: '/', 
    component: () => <div><h1>Home</h1></div>, 
    name: 'home' 
  },
  { 
    path: '/products', 
    component: () => ProductsPage(), 
    name: 'products' 
  },
  { 
    path: '/products/:id', 
    component: () => ProductDetailPage(),
    name: 'product-detail',
    paramDecoders: { id: 'number' },
    prefetch: async (params, query, router) => {
      // Prefetch product data
      const res = await window.fetch(`/api/products/${params!.id}`);
      const product = await res.json();
      router!.state[`product:${params!.id}`] = product;
    }
  },
]);

export { routes };
```

**This example demonstrates:**
- ✅ `useQuery()` for reactive query parameters
- ✅ `useParams()` for reactive route parameters
- ✅ `useRouter()` for programmatic navigation
- ✅ `router.pushNamed()` for type-safe named navigation
- ✅ `Link` component for declarative navigation
- ✅ Query parameter updates with proper URL building
- ✅ Back navigation with `router.back()`
- ✅ Integration with `createResource()` for data fetching

## Key Takeaways

**Navigation Methods:**
- **Declarative**: Use `<Link>` components for navigation elements
- **Programmatic**: Use `router.push()` or `router.pushNamed()` for imperative navigation
- **Named routes**: Use `pushNamed()` for type-safe, refactor-friendly navigation

**Hooks for accessing route data:**
- **`useRouter()`**: Access the router instance (push, back, forward, etc.)
- **`useParams()`**: Get current route parameters reactively
- **`useQuery()`**: Get current URL query parameters reactively

**Best practices:**
- Use `pushNamed()` instead of `push()` when you have named routes
- Use hooks (`useParams`, `useQuery`) to access route data without prop drilling
- Combine query parameters with `createResource()` cache keys for smart data fetching
- Use `Link` with `prefetch` for instant-feeling navigation

> **What We've Learned**
>
> You now understand Auwla's complete routing API. You can define type-safe routes with `defineRoutes()`, organize them with `group()`, combine them with `composeRoutes()`, and navigate using both declarative (`Link`) and programmatic methods (`pushNamed`, `push`). You've learned to use `useParams()`, `useQuery()`, and `useRouter()` hooks to access route data reactively. This gives you everything needed to build sophisticated, production-ready SPAs with type-safe navigation.
{style="note"}
