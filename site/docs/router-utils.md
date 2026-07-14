# Router Utilities

Auwla exports a set of functional utilities to read the active location, query path parameters, check active states, build URLs, and register global lifecycle hooks.

All location accessors read directly from the router's active reactive context and trigger component updates automatically when the location changes.

---

## Component Usage Example

Here is a comprehensive component example showcasing how to read path parameters, query parameters, metadata, errors, and perform programmatic navigation. In Auwla, you write components without `return () =>` wrappers, letting the compiler handle early returns reactively:

```tsx
// src/components/DashboardHeader.tsx
import { 
  getLocation, 
  getParams, 
  getQuery, 
  getRouteMeta, 
  getRouteError, 
  isActive, 
  isExactActive,
  navigate,
  back
} from 'auwla/router';

export default function DashboardHeader() {
  // 1. Read route parameters
  const params = getParams(); // e.g. { userId: "42" }
  
  // 2. Read query strings
  const query = getQuery(); // e.g. { search: "tech", page: "2" }
  
  // 3. Read metadata defined on the route config
  const meta = getRouteMeta<{ category?: string }>();
  
  // 4. Retrieve route loading errors (if any)
  const error = getRouteError();

  // 5. Navigation helper methods
  const handleSignOut = () => {
    navigate('/login', { replace: true });
  };

  const currentPath = getLocation(); // e.g. "/users/42?search=tech"
  const isProfileActive = isActive('/users');
  const isExactUser = isExactActive(`/users/${params.userId}`);

  return (
    <header class="header">
      <h2>Dashboard Header</h2>
      
      {/* Render read location states */}
      <p>Active URL: {currentPath}</p>
      <p>User ID: {params.userId}</p>
      <p>Search Term: {query.search || 'None'}</p>
      <p>Route Category: {meta?.category || 'General'}</p>

      {/* Conditional styling using active indicators */}
      <div class="nav-links">
        <span class={isProfileActive ? 'active' : ''}>Profile Section</span>
        <span class={isExactUser ? 'exact-active' : ''}>Exact User Page</span>
      </div>

      {/* Render error banner if loader failed */}
      {error && (
        <div class="error-banner">
          Failed to load data: {String(error.reason)}
          <button onClick={() => error.refresh()}>Retry</button>
        </div>
      )}

      {/* Programmatic Navigation Controls */}
      <div class="controls">
        <button onClick={() => back()}>Go Back</button>
        <button onClick={handleSignOut}>Log Out</button>
      </div>
    </header>
  );
}
```

---

## Detailed Utility Reference

### 1. URL and Location Accessors

#### `getLocation()`
Returns the complete current path string including query strings:
* **Returns:** `string` (e.g. `"/posts/123?ref=search"`)

#### `getParams()`
Returns an object containing the route's dynamic path parameters:
* **Returns:** `Record<string, string>` (e.g. `{ id: "123" }`)

#### `getQuery()`
Returns an object mapping the active URL query parameters:
* **Returns:** `Record<string, string>` (e.g. `{ sort: "desc", limit: "10" }`)

---

### 2. Route Definition Readers

#### `getRouteMeta()`
Returns the custom metadata object declared inside the matched route's configuration:
* **Signature:** `getRouteMeta<T>(): T`
* **Example:**
  ```ts
  const meta = getRouteMeta<{ requiresAuth: boolean }>();
  if (meta.requiresAuth) { ... }
  ```

#### `getRouteError()`
Returns the `RouteError` context object if the loader (`routed`) throws an error:
* **Returns:** `RouteError | null`
* **Properties:**
  * `reason`: The error instance.
  * `refresh()`: Clears the error and retries execution.

---

### 3. Active State Indicators

#### `isActive(path)`
Checks if the current path starts with the specified path prefix:
* **Signature:** `isActive(path: string): boolean`
* **Example:** `isActive('/users')` returns true if URL is `/users` or `/users/42`.

#### `isExactActive(path)`
Checks if the current path equals the specified path exactly:
* **Signature:** `isExactActive(path: string): boolean`
* **Example:** `isExactActive('/users')` returns true only if URL is `/users`.

---

### 4. Navigation Control

#### `navigate(path, options?)`
Performs programmatic routing transitions:
* **Signature:** `navigate(path: string, options?: { replace?: boolean }): void`
* **Options:**
  * `replace`: If true, replaces the current history state instead of pushing.

#### `back()`
Moves back one entry in the session history.

#### `forward()`
Moves forward one entry in the session history.

---

### 5. URL Path Building

#### `pathFor(pattern, params, query)`
Interpolates parameters and appends query strings to construct a safe, escaped URL path:
* **Signature:** `pathFor(pattern: string, params: Record<string, string>, query?: Record<string, any>): string`
* **Example:**
  ```ts
  const path = pathFor('/users/:id/photos', { id: '42' }, { sort: 'newest' });
  // Returns "/users/42/photos?sort=newest"
  ```

---

### 6. Router Lifecycle Hooks

#### `afterEach(hookFn)`
Registers a global lifecycle hook that executes after every successful route transition:
* **Signature:** `afterEach((from: string | null, to: string) => void): () => void`
* **Returns:** An unregister callback function.
* **Example:**
  ```ts
  const unbind = afterEach((from, to) => {
    console.log(`Navigated from ${from} to ${to}`);
  });
  
  // Unbind later:
  // unbind();
  ```
