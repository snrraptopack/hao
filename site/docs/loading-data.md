# Loading Data

Auwla integrates routing and async data fetching into a single unified step. You can define a page loader function that retrieves server data, and read that data reactively inside your component view.

---

## The `routed` Loader Function

Each page in your `src/pages` directory can export a `routed` asynchronous function. The router executes this function when the route is matched (before mounting the component) and handles dynamic parameters and abort signals automatically.

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router';

// 1. Export the routed function to load data
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  const res = await fetch(`/api/posts/${ctx.params.id}`, { signal });
  return res.json();
};
```

---

## Reading Loader Data (`getRouted`)

To read the loader data inside your page component, import `getRouted` and pass your `routed` function reference to it:

```tsx
// src/pages/posts/[id].tsx (continued)
export default function PostDetail() {
  // 2. Read the loaded data reactively
  const data = getRouted(routed);

  // Handle loading and error states
  if (data?.pending) return <p>Loading post...</p>;
  if (data?.rejected) return <p>Error: {String(data.reason)}</p>;

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
The object returned by `getRouted` exposes the following reactive properties:
* **`.pending`** (`boolean`): `true` if the loader is currently fetching data.
* **`.resolved`** (`boolean`): `true` if the loader completed successfully.
* **`.rejected`** (`boolean`): `true` if the loader failed.
* **`.value`** (`any`): The data returned from your `routed` function.
* **`.reason`** (`any`): The error object if the loader rejected.

---

## Blocking Navigation & Deferred Loading (Suspension)

By default, navigation is non-blocking: the URL updates immediately, the new route component mounts, and the `routed` function runs in the background.

Auwla allows you to **block/defer navigation** until the `routed` promise resolves. This prevents displaying blank pages or loading states on the screen by keeping the previously matched route visible in the DOM during navigation.

To enable suspension, pass the `suspend` prop to your `<Router>` component:

```tsx
// src/App.tsx
import { Router } from 'auwla/router';
import routes from 'auwla:routes';

export default function App() {
  return (
    <Router 
      routes={routes} 
      suspend={true} // Defer route changes until loaders resolve
    />
  );
}
```

---

## Styling the Suspended State

While a route loader is resolving in the background during suspension, the router adds a `.suspended` class and a `data-suspended` attribute to the `<html>` element. 

You can write custom CSS rules to dim the page, disable interactions, or trigger transitions while loading is in progress:

```css
/* Dim the entire page slightly during navigation transitions */
html.suspended {
  opacity: 0.6;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
```

### Layout-Specific Suspension
You can also target specific portions of your app shell, like content areas or sidebars, rather than the entire document:

```css
html.suspended .main-content {
  opacity: 0.5;
  filter: blur(1px);
}
```

---

## Custom Transition Skeletons

If you want to render a skeleton placeholder instead of keeping the previous page visible, configure `pendingComponent` and `errorComponent` properties on your `<Router>`:

```tsx
// src/App.tsx
import { Router } from 'auwla/router';
import routes from 'auwla:routes';
import { PendingSkeleton } from './components/PendingSkeleton';
import { ErrorFallback } from './components/ErrorFallback';

export default function App() {
  return (
    <Router 
      routes={routes} 
      suspend={true}
      pendingComponent={PendingSkeleton} // Renders during suspension
      errorComponent={ErrorFallback}     // Renders if the loader fails
    />
  );
}
```
