# Loading Data

Auwla integrates routing and async data fetching into a single unified step. 

Instead of triggering asynchronous queries inside your component view (which can cause layout flashing and redundant renders), you can export a page loader function that retrieves data before the route is mounted.

---

## The `routed` Loader Function

Each page in your `src/pages` directory can export a `routed` asynchronous function. The router executes this function when the route is matched, injecting a context object and a cancellation `AbortSignal`.

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router';

// 1. Export the routed function to load data
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  const res = await fetch(`/api/posts/${ctx.params.id}`, { signal });
  return res.json();
};
```

### Abort Signal (Auto-Cancellation)
Auwla automatically passes an `AbortSignal` as the second argument to your `routed` function. If the user navigates away to a different route before the loader completes, the in-flight request is automatically aborted, saving bandwidth and preventing race conditions.

---

## Reading Loader Data (`getRouted`)

To read the loader data inside your component, import `getRouted` and pass your `routed` function reference to it:

```tsx
// src/pages/posts/[id].tsx (continued)
export default function PostDetail() {
  // 2. Read the loaded data reactively
  const data = getRouted(routed);

  // Handle loading states
  if (data?.pending) return <p>Loading post...</p>;

  // Render the resolved values
  return (
    <article>
      <h1>{data?.value?.title}</h1>
      <p>{data?.value?.body}</p>
    </article>
  );
}
```

### The Loader Handle API
The object returned by `getRouted` is fully typed and exposes the following reactive properties:
* **`.pending`** (`boolean`): `true` if the loader is currently fetching data.
* **`.resolved`** (`boolean`): `true` if the loader completed successfully.
* **`.rejected`** (`boolean`): `true` if the loader failed.
* **`.value`** (`any`): The data returned from your `routed` function.
* **`.reason`** (`any`): The error object if the loader rejected.
* **`.cancel()`** (`() => void`): Aborts the active loader promise.
* **`.refresh()`** (`() => void`): Re-runs the `routed` function to refetch data.

---

## Default Behavior: Instant Navigation

By default, data loading **does not block or defer navigation**. The URL changes and the new page component mounts immediately, running the `routed` function in the background.

When doing instant navigation, you can handle the pending loading state in three ways:

### 1. Local Inline Loading (Page Level)
Check the `pending` state directly inside the component body using `getRouted(routed)?.pending`:

```tsx
export default function Page() {
  const loader = getRouted(routed);
  if (loader?.pending) return <p>Loading content...</p>;
  return <div>{loader?.value}</div>;
}
```

### 2. Route-Level `pending` Component Export
You can export a custom component named `pending` directly from your page file. When the route is matched and the data is loading, the router will automatically mount this placeholder component:

```tsx
// src/pages/dashboard.tsx
export const routed = async (ctx: RouteContext, signal: AbortSignal) => {
  return await fetch('/api/dashboard', { signal }).then(r => r.json());
};

// Export the pending placeholder component
export function pending() {
  return (
    <div class="skeleton-wrapper">
      <p>Loading Dashboard...</p>
    </div>
  );
}

export default function Dashboard() {
  const data = getRouted(routed);
  return <div>{data?.value?.analytics}</div>;
}
```

### 3. Global Pending Component
Define a global fallback component on your `<Router>` to handle loading states for all routes:

```tsx
// src/App.tsx
import { Router } from 'auwla/router';
import { GlobalLoader } from './GlobalLoader';

export default function App() {
  return (
    <Router 
      routes={routes} 
      pendingComponent={GlobalLoader} 
    />
  );
}
```

---

## Deferring Navigation (Suspension)

If you want to defer the route transition and block the new page from mounting until its data resolves, enable **Suspension**. 

With suspension enabled, when a user clicks a link, the router **keeps the previous page visible in the DOM** while the loader runs in the background. 

```tsx
// src/App.tsx
import { Router } from 'auwla/router';

export default function App() {
  return (
    <Router 
      routes={routes} 
      suspend // Defer route changes until loaders resolve
    />
  );
}
```

### Hard Refreshes during Suspension
If the user performs a **hard refresh** (or visits a route directly for the first time), there is no "previous page" to show during suspension. To avoid showing a blank white screen:
1. The router will fall back to rendering your exported page-level `pending` component (if present).
2. If no page-level loader placeholder exists, it will render the global `pendingComponent` configured on the `<Router>`.

---

## Suspension Styling

While a route loader is resolving in the background during suspension, the router adds CSS class names and attributes to the root `<html>` element to let you style the transition.

### 1. Default Style Class (`.suspended`)
By default, the router adds the class name `.suspended` and the attribute `data-suspended` to the `<html>` element. You can style them in your CSS:

```css
/* Dim the page slightly and disable clicks during transitions */
html.suspended {
  opacity: 0.6;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
```

### 2. Custom Styling Configurations
If you want to use custom class names or attributes, pass a configuration object to the `suspend` prop:

```tsx
<Router 
  routes={routes} 
  suspend={{
    className: "navigating",     // Custom class added to <html> during loading
    attr: "data-navigating",     // Custom attribute added to <html> during loading
    viewTransition: true         // Enables document.startViewTransition()
  }}
/>
```

You can then reference these custom classes in your stylesheets:

```css
/* Custom class styling */
html.navigating {
  opacity: 0.7;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

/* Add a loading indicator stripe at the top of the viewport */
html.navigating::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #ff3e00;
  z-index: 9999;
  animation: progress 1.5s infinite linear;
}
```
