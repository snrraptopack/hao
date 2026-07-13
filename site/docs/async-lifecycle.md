# Async Data & Tracking

Auwla features `track`, a reactive async lifecycle primitive, to manage data fetching, server mutations, and loading states without writing manual `commit()` callbacks or reactive boilerplate. 

Any component that reads a tracked handle's status or value is automatically subscribed to updates, triggering DOM updates precisely when the promise settles.

---

## 1. Local Async Operations (`track`)

You can track standard browser async operations (like local `fetch` calls, timers, or custom microtasks) directly by passing an identifier and a promise (or an async function) to `track()`:

```tsx
import { track } from 'auwla/track';

function UserList() {
  // Starts tracking the network request immediately
  const loadUsers = track(
    'users-list',
    fetch('/api/users').then((res) => res.json())
  );

  return (
    <div>
      <h3>User Directory</h3>
      
      {/* Read reactive state cells directly in JSX */}
      {loadUsers.pending && <p class="loading">Loading users...</p>}
      {loadUsers.rejected && <p class="error">Error: {String(loadUsers.reason)}</p>}
      
      {loadUsers.resolved && (
        <ul>
          {loadUsers.value.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Auto-Cancellation
When you pass an async function to `track()`, Auwla invokes it immediately and injects an `AbortSignal`. 

If a new execution of `track()` with the **same identifier** is started while a previous run is still in-flight, Auwla automatically aborts the active signal. This prevents race conditions in search autocomplete interfaces:

```tsx
function PostSearch() {
  let query = "";
  let posts: any[] = [];

  const handleInput = (e: Event) => {
    query = (e.target as HTMLInputElement).value;
    
    // Starting a new track auto-cancels the previous "posts-search" run
    track('posts-search', async (signal) => {
      const res = await fetch(`/api/posts?q=${encodeURIComponent(query)}`, { signal });
      posts = await res.json();
    });
  };

  return (
    <div>
      <input type="text" onInput={handleInput} placeholder="Search posts..." />
      <ul>
        {posts.map((p) => <li key={p.id}>{p.title}</li>)}
      </ul>
    </div>
  );
}
```

---

## 2. Remote Queries (`track.get`)

When building fullstack applications, `track.get` executes server-side `GET` remote functions (queries). Arguments and return values are fully typed against your project's generated server manifest automatically.

```ts
import { track } from 'auwla/track';
import { getPost } from './posts.server'; // Server-side module stub

// Inferred typings: const post: TrackHandle<{ id: number; title: string }>
const post = track.get(getPost, { id: 123 });
```

### Stale-While-Revalidate (SWR) Caching
`track.get` utilizes a high-performance Stale-While-Revalidate cache to make your application feel instantaneous:

1. **Instant Render**: If the query has been resolved previously, Auwla instantly serves the cached data from memory. The UI renders immediately with no loading spinners.
2. **Background Sync**: Auwla automatically triggers a background network request to refetch the latest data from the server.
3. **Smart Updates**: Once the background request completes, Auwla structurally compares the new data with the cached value (`JSON.stringify` comparison). It **only** triggers a UI re-render if the server data has actually changed, preventing flashing and redundant layout cycles.

### Cache Scopes
You can scope caching behavior by passing options:

| Cache Scope Mode | Registry Namespace Prefix | URL Sensitive? | Persists on Navigation? | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Default** (neither) | `routePath::...` | **Yes** | **No** (cleared on route unmount) | Page-specific content (e.g. comments list). |
| **`global: true`** | `__global::...` | **No** (app-wide singleton) | **Yes** (persists indefinitely) | App configurations, current auth user. |
| **`id: string`** | `id:${id}::...` | **No** (route-independent) | **Yes** (persists indefinitely) | Shared entity detail data (e.g. details of post `123` across view & edit routes). |

```tsx
// Global query cache (auth status)
const auth = track.get('auth.me', {}, { global: true });

// Entity-scoped cache (sharing cache between /posts/123 and /posts/123/edit)
const post = track.get('posts.getPost', { id: 123 }, { id: 'post-123' });
```

---

## 3. Remote Commands / Mutations (`track.post`)

`track.post` creates a lazy command handle for server-side `POST` mutations. Unlike queries, **no network request is sent until you call `.run()`**.

```tsx
import { track } from 'auwla/track';

function CreatePostButton() {
  const save = track.post('posts.createPost');

  async function onSubmit() {
    // Invokes the server RPC mutation
    const newPost = await save.run({ title: 'New Article' });
  }

  return (
    <div>
      <button onClick={onSubmit} disabled={save.pending}>
        {save.pending ? 'Saving...' : 'Create Post'}
      </button>

      {save.rejected && <p class="error">{String(save.reason)}</p>}
      {save.resolved && <p class="success">Saved!</p>}
    </div>
  );
}
```

---

## 4. Forms & Progressive Enhancement (`track.form`)

`track.form` binds a server mutation to a `<form>` element. It supports progressive enhancement, client-side input validation via Standard Schema (Zod, Valibot, ArkType), and submit lifecycle callbacks.

```tsx
import { track } from 'auwla/track';
import * as z from 'zod';

const postSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters")
});

function AddPostForm() {
  const createPost = track.form('posts.createPost', {
    schema: postSchema,
    onSuccess: (newPost) => {
      console.log("Created successfully:", newPost);
    },
    onError: (err) => {
      console.error("Form error:", err);
    }
  });

  return (
    <form onSubmit={createPost.onSubmit}>
      <label>
        Title:
        <input name="title" type="text" />
      </label>
      
      {createPost.error && <p class="error">{createPost.error.message}</p>}

      <button type="submit" disabled={createPost.pending}>
        {createPost.pending ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## 5. Reactive Handle Reference

The `TrackHandle` object returned by `track()` has the following reactive properties that you can read directly in your render templates:

| Property | Type | Description |
| :--- | :--- | :--- |
| `.pending` | `boolean` | `true` if the promise is currently in-flight. |
| `.resolved` | `boolean` | `true` if the promise completed successfully. |
| `.rejected` | `boolean` | `true` if the promise failed/rejected. |
| `.value` | `any` | The resolved value of the promise. |
| `.reason` | `any` | The error object if the promise rejected. |
| `.status` | `'idle' \| 'pending' \| 'resolved' \| 'rejected'` | The current lifecycle state. |
| `.cancel()` | `() => void` | Aborts the active operation (if using an async function with an `AbortSignal`). |
| `.refresh()` | `() => void` | Re-executes the promise/async function. |

---

In the next section, we will see how routing works using the [File-Based Router](/docs/router).
