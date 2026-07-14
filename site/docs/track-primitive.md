# Track Primitive

Auwla provides the `track` primitive to observe the lifecycle of asynchronous operations (such as HTTP requests, file loaders, or timers) and update the DOM automatically when they resolve or fail.

---

## Basic Usage

Import `track` from `'auwla/track'` and call it inside your component's setup phase to wrap a promise or an async function:

```tsx
import { track } from 'auwla/track';

function UserProfile() {
  // 1. Wrap the fetch promise during setup
  const user = track(() => 
    fetch('/api/user').then((res) => res.json())
  );

  // 2. Read the tracked handle reactively in your template
  return (
    <div>
      {user.pending && <p>Loading user profile...</p>}
      
      {user.resolved && (
        <div>
          <h3>{user.value?.name}</h3>
          <p>Email: {user.value?.email}</p>
        </div>
      )}
      
      {user.rejected && (
        <p class="error">Failed to load: {String(user.reason)}</p>
      )}
    </div>
  );
}
```

---

## Reactive Handle State

The handle returned by the `track` primitive exposes the following reactive properties. When a component reads these properties during render, it automatically registers as a subscriber to the async lifecycle:

* **`.pending`** (`boolean`): `true` if the promise is currently running.
* **`.resolved`** (`boolean`): `true` if the promise completed successfully.
* **`.rejected`** (`boolean`): `true` if the promise failed.
* **`.value`** (`any`): The resolved value of the promise.
* **`.reason`** (`any`): The error reason if the promise rejected.
* **`.cancel()`** (`() => void`): Cancels the active async execution.

---

## Auto-Cancellation

When wrapping an async function, `track` passes an `AbortSignal` to the function:

```ts
const query = track('search', (signal) => 
  fetch(`/api/search?q=${term}`, { signal }).then(r => r.json())
);
```

If you trigger the search track again before the previous request has completed, `track` will automatically trigger `.abort()` on the previous request's `AbortSignal` to prevent out-of-order execution and race conditions.

---

## Named Caching & Global Watchers

When you call `track` with a string name argument as its first parameter, it registers the promise in a global registry:

```ts
// Starts once on mount and caches in the global registry
const data = track('fetchUser', () => 
  fetch('/api/user').then(res => res.json())
);
```

### Checking Named Tracks Locally
Instead of checking `.pending` directly on the returned handle object, you can import and call the `pending()` helper function passing the name of the track. This achieves the exact same result:

```tsx
import { track, pending, value } from 'auwla/track';

function UserProfile() {
  // Named track initialized in setup
  track('fetchUser', () => fetch('/api/user').then(res => res.json()));

  // Read status using global named checkers
  const isLoading = pending('fetchUser');
  const userData = value<{ name: string }>('fetchUser');

  return (
    <div>
      {isLoading && <p>Loading user...</p>}
      {userData && <h3>Welcome back, {userData.name}!</h3>}
    </div>
  );
}
```

### Watching Named Tracks Globally
Auwla exports global helper functions to inspect the status or value of **any named track** from any component in the application:
* **`pending(name)`** (`boolean`): Returns true if the named track is active.
* **`resolved(name)`** (`boolean`): Returns true if resolved.
* **`rejected(name)`** (`boolean`): Returns true if failed.
* **`value(name)`** (`any`): Returns the current cached value.

Any component that calls these helper functions inside its template is automatically subscribed to that track's lifecycle. When the named track resolves or changes state, all watching components re-render automatically.

#### Example: Global Loading Bar
```tsx
// src/components/GlobalSpinner.tsx
import { pending } from 'auwla/track';

export default function GlobalSpinner() {
  // Subscribes to the status of the 'fetchUser' track.
  // Re-renders and displays the spinner when 'fetchUser' is in-flight.
  const isUserLoading = pending('fetchUser');

  if (!isUserLoading) return null;
  return <div class="spinner">Loading user database...</div>;
}
```
