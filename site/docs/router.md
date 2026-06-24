# File-Based Router

Auwla includes a built-in client-side router built on top of the reactive cell system. It features nested layouts, route-level data preloading, automatic abort handling, and typed path param extraction.

---

## Folder Structure Mapping

By registering the `auwlaRouter()` plugin in your Vite config, you activate file-based routing. The compiler scans your `src/pages/` directory and generates matching routes:

```text
src/pages/
  index.tsx             →  /
  about.tsx             →  /about
  _layout.tsx           →  (Layout wrapping index and about)
  posts/
    index.tsx           →  /posts
    [id].tsx            →  /posts/:id
  [...404].tsx          →  /* (Catch-all fallback route)
```

In your main entry file, simply import the virtual route map and mount the `<Router>` component:

```tsx
// src/App.tsx
import { Router } from 'auwla/router';
import routes from 'auwla:routes';

export default function App() {
  return () => <Router routes={routes} suspend />;
}
```

---

## Nested Layouts (`_layout.tsx`)

Layout files export a wrapper component that intercepts rendering. They receive a `Child` parameter, which you render to display the matched sub-route:

```tsx
// src/pages/docs/_layout.tsx
import type { RouteComponent } from 'auwla/router';

export default function DocsLayout(Child: RouteComponent) {
  return () => (
    <div class="docs-layout">
      <aside>Documentation Sidebar</aside>
      <main>
        {/* Sub-route component rendered here */}
        <Child />
      </main>
    </div>
  );
}
```

---

## Route State and Parameters

You can read URL parameters and query states synchronously within any component setup block using helper hooks:

```tsx
import { getParams, getQuery, getLocation } from 'auwla/router';

function PostDetail() {
  // Path params from '/posts/:id'
  const { id } = getParams('/posts/:id'); // typed as { id: string }
  
  // Query parameters from '/posts/3?tab=comments'
  const query = getQuery(); // typed as { tab?: string }

  return () => (
    <article>
      <h1>Viewing Post: {id}</h1>
      <p>Active Tab: {query.tab ?? "default"}</p>
    </article>
  );
}
```

---

## Client-Side Navigation

Auwla provides a `<Link>` component that intercepts click events for smooth, client-side page transitions:

```tsx
import { Link, navigate } from 'auwla/router';

function Navbar() {
  return () => (
    <nav>
      {/* Basic Link */}
      <Link href="/about">About Us</Link>
      
      {/* Parameterized Link */}
      <Link href="/posts/:id" params={{ id: "42" }}>View Post</Link>

      {/* Programmatic Navigation */}
      <button onClick={() => navigate("/dashboard", { replace: true })}>
        Go to Dashboard
      </button>
    </nav>
  );
}
```

---

## Data Loading with `routed`

You can pre-fetch data for a page before it is rendered. Export an async `routed` function from your page component. The router runs this function when navigating to the route, passing an `AbortSignal` to automatically cancel requests if the user navigates away mid-load:

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router';

// 1. Define loader function (runs on navigation)
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  const res = await fetch(`/api/posts/${ctx.params.id}`, { signal });
  return await res.json();
};

export default function PostPage() {
  // 2. Read loader state in component setup
  const data = getRouted(routed);

  return () => (
    <div>
      {data?.pending && <p>Loading content...</p>}
      {data?.rejected && <p>Error: {String(data.reason)}</p>}
      
      {data?.resolved && (
        <article>
          <h1>{data.value.title}</h1>
          <p>{data.value.body}</p>
        </article>
      )}
    </div>
  );
}
```

---

In the next section, we will see how to implement backend RPC endpoints using **Server Functions**.
