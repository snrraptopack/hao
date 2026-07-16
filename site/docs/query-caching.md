=<Header>
title: Query Caching
=</Header>

# Query Caching

Auwla includes a built-in Stale-While-Revalidate (SWR) query caching engine. By default, query cache entries are bound to route paths to avoid leaking memory, but you can configure custom scopes for global sharing and resource reusability.

---

## Default Route-Scoped Caching

By default, when you fetch data using `track.get()`, the cache entry is tied to the **active route path**:

```typescript
// Defaults to scoping to: `routePath::posts.getPost`
const query = track.get('posts.getPost');
```

If a user executes this query on `/posts/1` and then navigates to `/posts/2`, Auwla will trigger a fresh server fetch request. 

While route-scoping is ideal for page-specific data (preventing stale details from rendering when moving between entities), it is inefficient for data that needs to persist across routes or be shared across child pages.

---

## Stale-While-Revalidate (SWR) Caching

When a cached query is triggered, Auwla optimizes the user experience using SWR:
1. **Instant UI Render**: If the query is found in the cache, Auwla returns it immediately, skipping any loading state.
2. **Background Sync**: Auwla automatically fires a background request to fetch fresh data from the server.
3. **Reactive Patching**: The UI is updated seamlessly only if the server returns a different payload.

---

## Scoping Cache Globally (`global: true`)

For configurations, active user details, or theme settings that must be accessed everywhere, set `global: true`. This registers the query as an app-wide singleton:

=<Tabs>
  =<Tab title="Direct Import">
```tsx [src/pages/dashboard.tsx]
import { track } from 'auwla/track';
import { getProfile } from './dashboard.server';

function UserBadge() {
  // Scopes cache globally, persisting it across navigations
  const user = track.get(getProfile, { global: true });

  if (user.pending && !user.value) return <span>Loading...</span>;
  return <span>Welcome, {user.value?.username}</span>;
}
```
  =</Tab>

  =<Tab title="String Key">
```tsx [src/pages/dashboard.tsx]
import { track } from 'auwla/track';

function UserBadge() {
  // Scopes cache globally, persisting it across navigations
  const user = track.get('dashboard.getProfile', { global: true });

  if (user.pending && !user.value) return <span>Loading...</span>;
  return <span>Welcome, {user.value?.username}</span>;
}
```
  =</Tab>
=</Tabs>

---

## Scoping Cache by Resource ID (`id: string`)

If multiple routes or nested child pages need to access the same database entity, scope the cache to a custom ID. This decouples the cache from the active route URL and links it directly to the resource identifier:

=<Tabs>
  =<Tab title="Direct Import">
```tsx [src/pages/posts/[id].tsx]
import { track } from 'auwla/track';
import { getPost } from './[id].server';

export default function PostDetail({ params }) {
  // Scopes the query to this entity ID (e.g. 'post-123') across all routes
  const post = track.get(getPost, {
    id: `post-${params.id}`
  });

  if (post.pending && !post.value) return <p>Loading post...</p>;
  return <h2>{post.value?.title}</h2>;
}
```
  =</Tab>

  =<Tab title="String Key">
```tsx [src/pages/posts/[id].tsx]
import { track } from 'auwla/track';

export default function PostDetail({ params }) {
  // Scopes the query to this entity ID (e.g. 'post-123') across all routes
  const post = track.get('posts.getPost', {
    id: `post-${params.id}`
  });

  if (post.pending && !post.value) return <p>Loading post...</p>;
  return <h2>{post.value?.title}</h2>;
}
```
  =</Tab>
=</Tabs>

---

## Caching Options Reference

You customize the cache query lifecycle by passing parameters inside the second options argument object of `track.get`:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`id`** | `string` | `undefined` | Decouples the query cache from the route URL and scopes it to a custom entity ID (e.g., `'post-123'`). |
| **`global`** | `boolean` | `false` | Scopes the query cache globally as an app-wide singleton, ignoring parameters and route URLs. |
| **`skipBackgroundSync`** | `boolean` | `false` | Serves the resolved value from the cache directly and prevents triggering the background sync request. |
| **`signal`** | `AbortSignal` | `undefined` | An abort signal to cancel in-flight network requests. |

### Configuration Example:
```typescript
const post = track.get('posts.getPost', {
  id: `post-${params.id}`,
  global: false,
  skipBackgroundSync: true,
  signal: abortController.signal
});
```
