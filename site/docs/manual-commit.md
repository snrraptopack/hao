# Manual Commit

Event handlers in Auwla automatically schedule a re-render when they finish. But some updates happen outside of event handlers — in `fetch` callbacks, `setTimeout`, WebSocket messages, or any other asynchronous code. Those need an explicit `commit()` call.

> [!NOTE]
> If you are using `track()` or `event.track()` for async work, you do not need `commit()` — track handles that automatically. This page covers the lower-level escape hatch for cases where you are doing raw async work.

---

## Using `commit()`

Call `commit()` after you have mutated state in an async callback:

```tsx
import { commit } from 'auwla';

interface User {
  id: number;
  name: string;
}

function UserList() {
  let users: User[] = [];
  let loading = true;

  fetch('/api/users')
    .then(res => res.json())
    .then(data => {
      users = data;  // mutate state
    })
    .finally(() => {
      loading = false;
      commit();      // tell Auwla to re-render
    });

  return () => (
    <div>
      {loading ? (
        <p>Loading...</p>
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

Multiple `commit()` calls within the same microtask are **batched** — Auwla will only re-render once regardless of how many times you call it.

---

## Scoped Commits With `commit(handle)`

Pass a component handle to `commit()` to re-render only that component's subtree instead of the whole app. This is covered fully in the [Component Lifecycle](lifecycle) page, but the short version is:

```tsx
import { component, commit, cleanup } from 'auwla';

function Timer() {
  const self = component();  // get a handle to this component in setup
  let seconds = 0;

  const id = setInterval(() => {
    seconds++;
    commit(self);  // only this Timer re-renders
  }, 1000);

  cleanup(() => clearInterval(id));

  return () => <p>Elapsed: {seconds}s</p>;
}
```

---

## When to Use What

| Scenario | Solution |
|---|---|
| Click / input / form submit | Nothing — re-render is automatic |
| `fetch` or `setTimeout` in setup | `commit()` after mutation |
| High-frequency timer (`setInterval`) | `commit(self)` — scope it to the component |
| Async data with loading / error states | `track()` from `auwla/track` — no manual commit needed |
| Search / debounced input | `event.track()` from `auwla/events` — handles cancellation too |
