=<Header>
title: Error Component
=</Header>

# Error Component

Auwla includes built-in hooks and layout wrappers to capture errors during data loading and rendering gracefully, protecting your application from crashing.

---

## The Route Error Object

When a page loader (`routed`) fails or throws an exception, the router captures the rejection and creates a `RouteError` context object. This object exposes:
* **`.reason`** (`any`): The error instance or description thrown by the async operation.
* **`.refresh`** (`() => void`): A callback to clear the error state and retry executing the `routed` function.

---

## Route-Level `error` Component Export

Each page file in your `src/pages` directory can export a custom component named `error`. When the `routed` function fails, the router will automatically mount this custom component in place of the page view:

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext, type RouteError } from 'auwla/router';

export const routed = async (ctx: RouteContext, signal: AbortSignal) => {
  const res = await fetch(`/api/posts/${ctx.params.id}`, { signal });
  if (!res.ok) {
    throw new Error(`Failed to load post: ${res.statusText}`);
  }
  return res.json();
};

// Export the custom error page component
export function error(err: RouteError) {
  return (
    <div class="error-container">
      <h3>Error Loading Post</h3>
      <p>{String(err.reason)}</p>
      
      {/* Retries the routed fetch operation */}
      <button onClick={() => err.refresh()}>
        Try Again
      </button>
    </div>
  );
}

export default function PostDetail() {
  const data = getRouted(routed);
  return <h1>{data?.value?.title}</h1>;
}
```

---

## Global Fallback Error Component

You can define a global fallback error component on your `<Router>` to handle errors across all matched pages:

```tsx
// src/App.tsx
import { Router, type RouteError } from 'auwla/router';
import routes from 'auwla:routes';

function GlobalErrorView(err: RouteError) {
  return (
    <div class="p-8 border border-red-200 bg-red-50 rounded-xl text-red-800">
      <h2>Something went wrong</h2>
      <p class="text-sm mt-2">{String(err.reason)}</p>
      <button 
        class="mt-4 px-4 py-2 bg-red-600 text-white rounded" 
        onClick={() => err.refresh()}
      >
        Retry Connection
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router 
      routes={routes} 
      errorComponent={GlobalErrorView} 
    />
  );
}
```

---

## Programmatic Access (`getRouteError`)

You can read the active route error context programmatically from any component inside the `<Router />` tree:

```tsx
import { getRouteError } from 'auwla/router';

export function SidebarErrorWidget() {
  const error = getRouteError();

  if (!error) return null;
  return (
    <div class="text-xs text-red-500">
      System is currently offline. <span class="underline cursor-pointer" onClick={() => error.refresh()}>Retry</span>
    </div>
  );
}
```
