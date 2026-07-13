# Working With State

State in Auwla is plain JavaScript. There are no wrappers to import, no constructors to call, and no markers to apply. A variable declared in the component setup scope is state. If it changes, the next render will reflect the new value.

---

## The Basics

The simplest component is a counter. A `let` variable, mutated directly inside a click handler:

```tsx [Counter.tsx]
function Counter() {
  let count = 0;

  return (
    <button onClick={() => count++}>
      Count: {count}
    </button>
  );
}
```

The component function runs once. It sets up `count` as a plain variable and returns a render closure. Every time the button is clicked, `count++` runs inside an event handler. Auwla wraps every JSX event handler at compile time with an invalidation step, so after the handler completes, the render closure re-runs, reads the new value of `count`, and patches just the text node that changed.

Nothing reactive about the variable. The event is the boundary.

---

## Objects, Arrays, and Derived Values

Because state is just JavaScript, objects and arrays work exactly as you would expect. Mutate in place and Auwla re-renders:

```tsx [TodoList.tsx]
function TodoList() {
  const todos: { id: number; text: string; done: boolean }[] = [];
  let input = '';

  function add() {
    if (!input.trim()) return;
    todos.push({ id: Date.now(), text: input, done: false });
    input = '';
  }

  return (
    <div>
      <input
        value={input}
        onInput={(e) => { input = (e.target as HTMLInputElement).value; }}
      />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => { t.done = !t.done; }}
            />
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Keys in lists must be stable identifiers from the data, never the array index. When items are reordered or removed, an index key changes for surviving items and Auwla would treat them as new nodes. A stable `id` from the data tells Auwla which DOM node belongs to which item and reuses it correctly.

Derived values require no wrappers either. Declare them in setup scope and the compiler tracks what they depend on:

```tsx [Stats.tsx]
function Stats() {
  const scores: number[] = [10, 20, 30];

  let total   = scores.reduce((a, b) => a + b, 0);
  let average = scores.length ? total / scores.length : 0;

  return (
    <div>
      <p>Total: {total}</p>
      <p>Average: {average.toFixed(1)}</p>
    </div>
  );
}
```

The compiler detects that `total` and `average` depend on `scores` and compiles them into tracked computations. When `scores` changes, they update. You do not write that tracking yourself.

This works for `Map` and `Set` too, at any depth. There is no special reactive collection class to reach for:

```tsx [TeamRoster.tsx]
function TeamRoster() {
  const members = new Map([[1, 'Alice'], [2, 'Bob']]);

  let count = members.size;
  let names = [...members.values()].join(', ');

  function add(id: number, name: string) {
    members.set(id, name);
  }

  return (
    <div>
      <p>{count} members: {names}</p>
      <button onClick={() => add(Date.now(), 'New')}>Add member</button>
    </div>
  );
}
```

---

## Async Just Works

Not every mutation happens inside a click. A component might load data when it mounts, or tick on a timer. Write it the way you would write plain JavaScript, and it works:

```tsx [UserCard.tsx]
function UserCard() {
  let user: { name: string; email: string } | null = null;

  fetch('/api/user')
    .then((r) => r.json())
    .then((data) => {
      user = data;
    });

  return(
    <div>
      {user ? <p>{user.name}</p> : <p>Loading...</p>}
    </div>
  );
}
```

No import, no wrapper, no boilerplate. The fetch resolves, `user` is assigned, and the card re-renders with the new data — and only this card, not the rest of the page.

The same is true for timers:

```tsx [Ticker.tsx]
function Ticker() {
  let time = new Date().toLocaleTimeString();

  setInterval(() => {
    time = new Date().toLocaleTimeString();
  }, 1000);

  return<p>{time}</p>;
}
```

The clock updates every second. Nothing else on the page is touched.

> [!NOTE]
> This works for `fetch().then()`, `async`/`await`, `setTimeout`, `setInterval`, and other common async boundaries the compiler recognizes. It automatically schedules re-renders when mutations occur inside these asynchronous scopes.
