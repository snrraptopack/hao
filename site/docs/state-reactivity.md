# State & Reactivity

Before learning how Auwla approaches state, it helps to slow down and look at what the web already gives us, and ask honestly whether we have been working with it or around it.

---

## Where It All Started

State is just a variable whose value changes over time. Here is the simplest possible counter in plain HTML and JavaScript, no framework involved:

=<Tabs>
  =<Tab title="HTML">
```html [index.html]
<button id="btn">Count: <span id="display">0</span></button>
```
  =</Tab>
  =<Tab title="JavaScript">
```js [app.js]
let count = 0;

const button = document.querySelector('#btn');
const display = document.querySelector('#display');

button.addEventListener('click', () => {
  count++;                              // 1. mutate the variable
  display.textContent = String(count); // 2. manually update the DOM
});
```
  =</Tab>
=</Tabs>

Two things happen on every click: you mutate `count`, and you manually update the DOM to reflect the new value. For a single variable this is fine. In a real application with dozens of variables and hundreds of DOM nodes, keeping that sync by hand is exactly where bugs are born and where maintenance cost quietly accumulates.

Frameworks exist to automate step 2. You write `count++` and the DOM updates itself. That is the promise, and it is a good one. But the way each framework delivers on it reveals very different assumptions about what the developer should have to understand.

---

## How the Ecosystem Responded

Each framework below solves the sync problem, and each one does it well. The counter is the simplest possible case, so here is how each one looks at that scale first:

=<Tabs>
  =<Tab title="React">
```tsx [Counter.tsx]
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```
  =</Tab>
  =<Tab title="Solid">
```tsx [Counter.tsx]
import { createSignal } from 'solid-js';

export default function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
}
```
  =</Tab>
  =<Tab title="Vue">
```vue [Counter.vue]
<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>
```
  =</Tab>
  =<Tab title="Svelte">
```svelte [Counter.svelte]
<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Count: {count}
</button>
```
  =</Tab>
=</Tabs>

Each of these is a capable solution, and the communities behind them are thoughtful. But a counter hides most of the cost. The mental model each framework introduces becomes clearer when the component has to do more than one thing at once. Below is a `Profile` component that does what most real components eventually do: fetch data when a prop changes, derive a display value from that data, track a separate piece of UI state, and log a side effect without that side effect re-running for the wrong reasons.

---

### React

React asks you to replace your `let` with `useState`, split every variable into a getter and setter, and never mutate directly. For a counter that overhead is acceptable. For a component with multiple concerns, the hook surface expands quickly:

```tsx [Profile.tsx]
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export default function Profile({ userId }: { userId: string }) {
  const [user, setUser]   = useState(null);
  const [theme, setTheme] = useState('dark');

  // fetch when userId changes
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  // log a visit when userId changes, but read the latest theme without
  // making theme a dependency — adding it would re-log on every toggle
  // the pre-19.2 workaround: mirror theme into a ref and read from there
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    logVisit(userId, themeRef.current);
  }, [userId]);

  // stable reference so child components do not re-render unnecessarily
  const handleThemeToggle = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  // derived value, recomputed only when user changes
  const displayName = useMemo(() => {
    return user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  }, [user]);

  return (
    <div style={{ color: theme }}>
      <p>{displayName}</p>
      <button onClick={handleThemeToggle}>Toggle theme</button>
    </div>
  );
}
```

The `themeRef` workaround is the standard pre-19.2 answer to reading a value inside an effect without making it a reactive dependency. Two extra hooks just to read one variable cleanly. React 19.2 introduced `useEffectEvent` to address this directly:

```tsx [Profile.tsx]
import { useState, useEffect, useCallback, useMemo, useEffectEvent } from 'react';

export default function Profile({ userId }: { userId: string }) {
  const [user, setUser]   = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  // useEffectEvent marks the callback as event-like so it always reads
  // the latest theme without theme being listed as a dependency
  const onVisit = useEffectEvent(() => {
    logVisit(userId, theme);
  });

  useEffect(() => {
    onVisit();
  }, [userId]);

  const handleThemeToggle = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const displayName = useMemo(() => {
    return user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  }, [user]);

  return (
    <div style={{ color: theme }}>
      <p>{displayName}</p>
      <button onClick={handleThemeToggle}>Toggle theme</button>
    </div>
  );
}
```

`useEffectEvent` is a genuine improvement and the React team's reasoning is sound. What is worth noting is how their own documentation frames it: as a way to separate "events from effects." That framing is the right observation. But arriving at it required a new hook, new linter rules, and a new section of documentation. By the time a developer has worked through `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, and `useEffectEvent`, they have accumulated a significant amount of framework-specific knowledge to manage something that was not a problem in plain JavaScript.

---

### Solid

Solid approaches reactivity from first principles rather than extending React's model. It is a pure signal-based framework and genuinely very fast, consistently near the top of rendering benchmarks. Every reactive value is a signal, and signals are functions: you call them to read their value.

```tsx [Profile.tsx]
import { createSignal, createMemo, createEffect } from 'solid-js';

export default function Profile(props: { userId: string }) {
  const [user, setUser]   = createSignal(null);
  const [theme, setTheme] = createSignal('dark');

  // createEffect auto-subscribes to any signal read inside it
  createEffect(() => {
    fetchUser(props.userId).then(setUser);
  });

  createEffect(() => {
    logVisit(props.userId, theme()); // theme() called to read
  });

  const displayName = createMemo(() =>
    user()
      ? `${user().firstName} ${user().lastName}`
      : 'Loading...'
  );

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <div style={{ color: theme() }}>   {/* theme() to read */}
      <p>{displayName()}</p>           {/* memo values are functions too */}
      <button onClick={toggleTheme}>Toggle theme</button>
    </div>
  );
}
```

`theme()` not `theme`. `user()` not `user`. `displayName()` not `displayName`. The function-call syntax is what makes Solid's runtime know exactly which computations depend on which signals, and that precision is why it is so fast. But it also means the code no longer reads like plain JavaScript. Every signal access is a call site, and you always have to know which values are signals and which are not.

---

### Vue

Vue wraps reactive values in `ref()`. Inside script you access and mutate them via `.value`. Inside the template the compiler unwraps them automatically, which means the same variable is written two different ways depending on where you are.

```vue [Profile.vue]
<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue';

const props = defineProps<{ userId: string }>();

const user  = ref(null);
const theme = ref('dark');

// watchEffect re-runs when any ref read inside it changes
watchEffect(async () => {
  user.value = await fetchUser(props.userId); // .value to write
});

// watch is explicit about what triggers the callback
watch(
  () => props.userId,
  (newId) => {
    logVisit(newId, theme.value); // .value to read in script
  }
);

const displayName = computed(() =>
  user.value
    ? `${user.value.firstName} ${user.value.lastName}`
    : 'Loading...'
);

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <!-- the template compiler unwraps refs, no .value here -->
  <div :style="{ color: theme }">
    <p>{{ displayName }}</p>
    <button @click="toggleTheme">Toggle theme</button>
  </div>
</template>
```

Vue's model is consistent once internalized. The `.value` seam between script and template is something every Vue developer eventually has to carry: `theme.value` in one context, `theme` in the other. The same variable, two access patterns.

---

### Svelte

Svelte 5 is the closest of the group to natural JavaScript. The `$state` rune compiles away entirely, mutation is plain assignment, and there is no getter or setter function to call.

```svelte [Profile.svelte]
<script lang="ts">
  const { userId }: { userId: string } = $props();

  let user  = $state(null);
  let theme = $state('dark');

  $effect(() => {
    fetchUser(userId).then(u => { user = u; });
  });

  $effect(() => {
    logVisit(userId, theme);
  });

  let displayName = $derived(
    user ? `${user.firstName} ${user.lastName}` : 'Loading...'
  );

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark'; // plain assignment
  }
</script>

<div style:color={theme}>
  <p>{displayName}</p>
  <button onclick={toggleTheme}>Toggle theme</button>
</div>
```

Svelte 5's runes are clean and the syntax is honest. Plain assignment mutates state, `$derived` reads naturally in the template, and there are no getters or setters to call. But `$state` is still a marker you have to apply. Without it, the variable is inert. Reactivity is something you opt into.

---

The pattern across all of these is consistent: **reactivity is something you acquire.** You import a function, wrap a value, call a constructor, or apply a rune. The variable is only reactive once you have done that work.

---

### Auwla

In Auwla there is nothing to import for reactivity. Every variable is a plain `let`. Every function is a plain function

```tsx [Profile.tsx]
function Profile({ userId }: { userId: string }) {
  let user  = null;
  let theme = 'dark';

  async function loadUser() {
    user = await fetchUser(userId);
    logVisit(userId, theme); // theme is just a variable — no .value, no ()
  }

  loadUser();

  // plain expression — the compiler tracks that displayName depends on `user`
  // and keeps it in sync without any derived wrapper
  let displayName = user
    ? `${user.firstName} ${user.lastName}`
    : 'Loading...';

  // plain function, plain assignment
  // JSX event handlers are wrapped at compile time, so this triggers
  // a re-render automatically when the button is clicked
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }

  return (
    <div style={{ color: theme }}>
      <p>{displayName}</p>
      <button onClick={toggleTheme}>Toggle theme</button>
    </div>
  );
}
```

No `useState`. No `useEffect`. No dependency arrays. No `.value`. No signal function calls. No `$state` marker. `user`, `theme`, and `displayName` are the same plain JavaScript variables they would be anywhere else.

---

## Why Events, Not Primitives

Go back to the plain JavaScript counter at the top of this page. There is no `useState`, no `ref()`, no `$state`, no `createSignal`. The variable `count` is just a `let`. And yet it works.

Now ask: why did `count` change? Because a click happened. An event fired. Inside the handler, the variable was mutated.

That is not an implementation detail. It is the actual mechanism. In a browser, state changes because events occur. Not always user events: a fetch completing, a timer firing, a WebSocket message arriving are all events too, but the shape is the same. Something happens, a handler runs, variables change. The `Profile` example above has three of those: a button click that toggles the theme, an async function that settles after a fetch, and a `userId` prop change that kicks off a new load. In every case, the source is an event.

The frameworks covered here each solved the sync problem by introducing a reactive primitive and connecting it to the rendering system. That works, and it works well. But it also means every variable that needs to participate in the UI must be consciously enrolled: wrapped, marked, or called through a specific API. The primitive is the entry point.

Auwla starts from the other direction. If state only ever changes because an event occurred, then the event handler is a natural place to put the reactive boundary. The compiler wraps every JSX event handler and every async task boundary at build time. When one of those boundaries is crossed, a re-render is scheduled. The variables themselves do not need to know they are reactive, because the compiler already knows where mutations can happen.

The result is what you saw in the Auwla section above: plain `let` or `const` variables, plain functions, plain expressions.

---

In the next section, [Working With State](/docs/working-with-state) covers objects, arrays, derived values, and shared state across components.
