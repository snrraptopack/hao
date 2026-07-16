=<Header>
title: Route Caching
=</Header>

# Route Caching

Auwla includes a built-in route-level caching system. It enables developers to store data and components directly in the route context, avoiding unnecessary network requests when navigating back and forth between pages.

---

## Route State (`ctx.state`)

The `RouteContext` passed as the first parameter to your page loader (`routed`) function contains a persistent, route-specific `state` object (`ctx.state`). This object is associated with the exact resolved path (e.g. `/posts/123`).

Writing to `ctx.state` caches data directly on that route. When users revisit the exact same URL, you can return the cached value instantly, avoiding duplicate fetches:

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router';

export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  // 1. Check if the post data is already cached in this route state
  if (ctx.state.post) {
    return ctx.state.post;
  }

  // 2. Fetch fresh data if the cache is empty
  const res = await fetch(`/api/posts/${ctx.params.id}`, { signal });
  const post = await res.json();

  // 3. Cache the post data in the route state
  ctx.state.post = post;
  return post;
};

export default function PostDetail() {
  const data = getRouted(routed);
  return <h1>{data?.value?.title}</h1>;
}
```

---

## Tag-Based Cache Invalidation

Often, you need to clear cached route states when data is updated (e.g., when a user edits a post, you want to make sure the post detail page gets refetched). Auwla handles this using a declarative tagging system.

### 1. Tagging Routes (`ctx.tag`)
Tag the active route context during data loading using `ctx.tag(...tags)`. You must specify the `signal` argument in your loader function signature:

```tsx
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  // Tag this route context with the general group and the specific post ID
  ctx.tag('posts', `post-${ctx.params.id}`);

  if (ctx.state.post) {
    return ctx.state.post;
  }
  
  const post = await fetch(`/api/posts/${ctx.params.id}`, { signal }).then(r => r.json());
  ctx.state.post = post;
  return post;
};
```

### 2. Invalidating Cache (`invalidate`)
Import `invalidate` from `auwla/router` inside event handlers or form mutation functions. You can clear caches globally using three matching strategies:

```ts
import { invalidate } from 'auwla/router';

// Strategy A: Invalidate by tag names
// Clears cache for all routes tagged with 'posts'
invalidate({ tags: ['posts'] });

// Strategy B: Invalidate an exact route path
invalidate({ path: '/posts/123' });

// Strategy C: Invalidate using wildcards
// Clears cache for all subpaths under /posts
invalidate({ path: '/posts/*' });
```

Once a route's state cache is invalidated, the next visit to that URL will execute the `routed` loader function from scratch.
