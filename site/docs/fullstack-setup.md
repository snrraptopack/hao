# Fullstack Setup

Auwla allows you to cleanly separate your backend setup from your bundler. By configuring a custom server entry file in `auwla.config.ts`, you can deploy your application on any platform by choosing the appropriate server adapter.

---

## Configuration (`auwla.config.ts`)

To specify a custom server entry, define the `server.entry` path in your global configuration:

```typescript
import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'ssr', // Target build mode: 'spa', 'ssr', or 'ssg'
  server: {
    entry: './src/server.ts' // Custom server entry path
  }
});
```

During development (`npm run dev`), Vite automatically intercepts requests and routes them through this server file as a middleware, ensuring development and production behave identically.

---

## Deploying with Server Adapters

Auwla exposes server adapters for different runtime environments. You import these adapters inside your server entry file to wrap the Auwla routing and rendering handlers.

### 1. Bun
The Bun adapter handles RPC routing, SSR page rendering, and static asset serving natively:

```typescript
// src/server.ts
import { createBunAdapter } from 'auwla/adapters/bun';

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: createBunAdapter() // Handles RPC requests, SSR, and assets
};
```

### 2. Hono
The Hono adapter integrates Auwla into Hono routers, allowing you to add custom routing and middlewares.

```typescript
// src/server.ts
import { Hono } from 'hono';
import { createHonoAdapter } from 'auwla/adapters/hono';
import { serveStatic } from 'hono/bun'; // Swap for your platform's static middleware

const app = new Hono();

// Serve built assets first
app.use('/assets/*', serveStatic({ root: './dist' }));

// Delegate remaining paths to the Auwla handler
app.use('*', createHonoAdapter());

export default app;
```

### 3. WinterCG (Standard Fetch)
The core fetch adapter is suitable for standard fetch environments (like Deno or Cloudflare Workers). It expects requests at the `/_auwla/rpc` path and returns standard response structures:

```typescript
// src/server.ts
import { createFetchAdapter } from 'auwla/adapters/fetch';
import manifest from 'auwla:server-manifest'; // Virtual server manifest

const handle = createFetchAdapter({ manifest });

export default {
  fetch: handle
};
```

---

## Request Fallthrough

When a request enters the adapter:
1. If the request matches a compiled server RPC endpoint path, the adapter executes the remote function and returns the serialized JSON output.
2. If the request is for a layout page under SSR target, the adapter pre-renders the HTML page and returns it.
3. If no matching path is found, the adapter falls back to serving static assets, or returns a standard `404 Not Found` response.
