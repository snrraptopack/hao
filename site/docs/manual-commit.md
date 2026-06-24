# Manual Commit

Auwla relies on an event-driven scheduler to update the DOM. While synchronous event handlers trigger automatic updates, asynchronous operations require you to explicitly commit changes.

---

## Why is a Manual Commit Necessary?

Auwla wraps all JSX event handlers (like `onClick`, `onInput`) in an invalidation wrapper. When the handler finishes execution, Auwla automatically queues a re-render.

However, if you mutate variables inside an **asynchronous callback** (such as a `fetch` response, a `setTimeout`, or a `WebSocket` message handler), the callback runs outside the synchronous event context. Auwla cannot auto-detect these changes. You must trigger them manually using `commit()`.

---

## Using `commit()`

Here is how you use `commit()` to update the UI after fetching data:

```tsx
import { commit } from 'auwla';

interface User {
  id: number;
  name: string;
}

function UserList() {
  let users: User[] = [];
  let loading = true;

  // Asynchronous fetch trigger in setup
  fetch('/api/users')
    .then(res => res.json())
    .then(data => {
      users = data; // Mutate state
    })
    .finally(() => {
      loading = false; // Mutate state
      commit(); // 👈 Explicitly trigger a re-render
    });

  return () => (
    <div>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Component-Scoped Commits with `component()`

By default, calling `commit()` without arguments invalidates the entire application root. While this is fast, large applications can be optimized by targeting updates to specific components.

By calling `component()` in the setup scope, you get a reference to the current component instance. You can pass this reference to `commit(self)` to only re-render that specific component and its children:

```tsx
import { component, commit } from 'auwla';

function Timer() {
  const self = component(); // 👈 Obtain component instance
  let seconds = 0;

  setInterval(() => {
    seconds++;
    commit(self); // 👈 Re-renders ONLY this Timer component
  }, 1000);

  return () => (
    <div class="timer">
      Seconds elapsed: {seconds}
    </div>
  );
}
```

> [!IMPORTANT]
> Always call `component()` synchronously at the top-level of your component's setup function. Do not call it inside callbacks or inside the returned render closure.

---

In the next section, we will see how to simplify input handling with **Two-Way Binding**.
