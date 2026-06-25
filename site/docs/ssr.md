# Server-Side Rendering

Auwla is designed for isomorphic apps: the same components can render to HTML on the server and hydrate on the client without refetching data.

> SSR is still being rolled out. The architecture is stable; check `SSR_PLAN.md` and `ssr.md` in the repo for the latest implementation status.

---

## Architecture

Auwla's SSR mirrors its dual-path client architecture:

1. **Compiled components** are lowered to **template-literal string concatenation** on the server instead of DOM mutations.
2. **Runtime bailouts** produce lightweight `SsrNode` objects that stringify into HTML.
3. **Route loaders (`routed`)** run and resolve before render, so the component tree evaluates synchronously against already-resolved data.
4. **Hydration** walks the existing server-rendered DOM, captures element references, and re-attaches event listeners.

---

## Build Orchestration

When you pass `serverEntry` to the Vite plugin, `vite build` runs two passes automatically:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { auwla } from 'auwla/vite';
import { auwlaRouter } from 'auwla/vite-router';

export default defineConfig({
  plugins: [
    auwla({ serverEntry: './src/server.ts' }),
    auwlaRouter(),
  ],
});
```

1. The client app is built to `dist/`.
2. A second pass builds the backend server entry to `dist/server/`.

If `serverEntry` is omitted, only the client bundle is produced.

---

## Server Entry

A production server mounts the RPC adapter and serves static files:

```ts
// src/server.ts
import { createBunAdapter } from 'auwla/adapters/bun';

Bun.serve({
  fetch: createBunAdapter(),
});
```

For Hono:

```ts
import { Hono } from 'hono';
import { createHonoAdapter } from 'auwla/adapters/hono';

const app = new Hono();
app.use('/_auwla/*', createHonoAdapter());
```

---

## Data Resolution Before Render

The router awaits the matched route's `routed` function before rendering. By the time components run, `track.get()` calls see `.resolved` data and render synchronously.

```tsx
export const routed = async (ctx, signal) => {
  return track.get('posts.getPosts', { signal });
};

export default function PostsPage() {
  const data = getRouted(routed);

  if (data?.pending)  return <p>Loading…</p>;
  if (data?.rejected) return <p>Error</p>;

  return () => (
    <ul>
      {data?.value?.map((post) => <li key={post.id}>{post.title}</li>)}
    </ul>
  );
}
```

The resolved track registry is serialized into the HTML so the client can hydrate without refetching.

---

## Hydration

On the client, `createMemoApp` detects a server-rendered root and hydrates instead of mounting from scratch:

```tsx
// src/main.tsx
import { createMemoApp } from 'auwla';
import { Router } from 'auwla/router';
import routes from 'auwla:routes';

const root = document.getElementById('app');
if (root) {
  createMemoApp(root, <Router routes={routes} />);
}
```

Event listeners are re-attached during hydration, and resolved `track` handles resume in the `.resolved` state.

---

## Streaming (Future)

Because the compiler emits functions that push strings, Auwla can eventually stream HTML:

- Render the shell up to a pending `track` boundary.
- Stream a placeholder, await the promise, then stream the rest along with a `<script>` that injects the resolved data into the client's track registry.

Streaming is planned for a later phase; the current focus is synchronous rendering + hydration.

---

## Current Limitations

- `__keyedMap` is DOM-based; SSR needs a string equivalent.
- Event listeners cannot run on the server; hydration must re-attach them.
- Runtime state must be request-scoped on the server.

See `SSR_PLAN.md` for the detailed implementation checklist.

---

In the next section, we will explore the complete [API Reference](/docs/api-reference).
