# Async Lifecycle

While synchronous mutations in Auwla trigger automatic re-renders, asynchronous operations (like HTTP requests or long-running computations) normally require manual commits to update the DOM. 

To eliminate manual `commit()` boilerplate and handle loading states elegantly, Auwla provides a built-in reactive tracking primitive: `track` from `'auwla/track'`.

---

## The `track` Primitive

`track` takes a unique string identifier and a promise (or an async function). It returns a reactive **TrackHandle** that exposes the status of the operation:

```tsx
import { track } from 'auwla/track';

interface User {
  id: number;
  name: string;
}

function UserList() {
  let users: User[] = [];

  // 1. Start tracking the network request immediately
  const loadUsers = track(
    'users',
    fetch('/api/users').then((res) => res.json())
  );

  // 2. React to the promise completion
  loadUsers.then((data) => {
    users = data; // Safe: updates the local state variable
  });

  return () => (
    <div>
      <h3>User Directory</h3>
      
      {/* 3. Read reactive states directly in the render function */}
      {loadUsers.pending && <p class="loading">Fetching users...</p>}
      {loadUsers.rejected && <p class="error">Failed to load: {String(loadUsers.reason)}</p>}
      
      {loadUsers.resolved && (
        <ul>
          {users.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
      
      <small>Status: {loadUsers.status}</small>
    </div>
  );
}
```

---

## Reactive Handle Reference

The `TrackHandle` object returned by `track()` has the following reactive properties that you can read directly in your render closures:

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

## Async Functions & Auto-Cancellation

When you pass an async function to `track`, Auwla calls it immediately and injects an `AbortSignal`. 

If a new track request with the **same identifier** is started while the previous run is still in-flight, Auwla automatically aborts the active signal. This is perfect for search auto-completes:

```tsx
import { track } from 'auwla/track';
import { event } from 'auwla/events';

function PostSearch() {
  let posts: any[] = [];
  let query = "";

  const performSearch = () => {
    // Starting a new track auto-cancels the previous "posts-search" run
    track('posts-search', async (signal) => {
      const res = await fetch(`/api/posts?q=${encodeURIComponent(query)}`, { signal });
      posts = await res.json();
    });
  };

  return () => (
    <div>
      <input
        type="text"
        bind={query}
        onInput={event.debounce(300)(performSearch)}
        placeholder="Type to search..."
      />

      {/* Global helper: pending('identifier') checks if a track name is running */}
      {pending('posts-search') && <p>Searching...</p>}

      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

In the next section, we will cover client-side navigation using the **File-Based Router**.
