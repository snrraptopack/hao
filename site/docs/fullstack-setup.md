# Fullstack Setup

Auwla provides a unified fullstack developer experience. By separating configuration from your bundler, you can easily define how your application renders, switch backends, and co-locate server-side logic directly with your client views.

---

## The Server Layer & RPCs

Auwla scans for `.server.ts` files in your project and automatically compiles any exported functions into secure, type-safe RPC (Remote Procedure Call) endpoints. On the client, you can import and call these functions like normal asynchronous JavaScript code.

You can declare server files in two places:

### 1. Co-Located Server Files (Route-Specific)
Place a `.server.ts` file directly next to the `.tsx` page file that uses it.
* **Example:** `src/pages/dashboard.tsx` and `src/pages/dashboard.server.ts`
* **Why?** It scopes backend logic explicitly to the UI. The generated RPC endpoint name is automatically scoped to the page route. If you delete the page, its corresponding backend code is deleted automatically.

### 2. Centralized Server Files (Shared Backend)
Place server files in your global server folder (default: `src/server/`).
* **Example:** `src/server/auth.server.ts` or `src/server/db.server.ts`
* **Why?** For shared utilities, authentication middle-layers, or database singletons used across multiple routes.

---

## Configuration (`auwla.config.ts`)

Auwla allows you to manage build targets and server options globally in `auwla.config.ts`:

```typescript
import { defineConfig } from 'auwla/config';

export default defineConfig({
  // 1. Compile Target: Can be 'spa', 'ssr', or 'ssg'
  target: 'ssr', 
  
  // 2. Custom Directories configuration
  directories: {
    pages: 'src/pages',
    server: 'src/server'
  }
});
```

Pass the global configuration into your `vite.config.ts` plugins to apply it:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { auwla } from 'auwla/vite';
import { auwlaRouter } from 'auwla/vite-router';

export default defineConfig({
  plugins: [
    auwla(), // Automatically detects and loads auwla.config.ts
    auwlaRouter() 
  ]
});
```

---

## Target Render Modes

Auwla supports three global compile targets:
* **`spa` (Single Page App)**: Compilation targets client-side hydration and execution. Server logic is called via HTTP requests.
* **`ssr` (Server-Side Rendering)**: Pages are rendered on the server for each request and hydrated dynamically on the client.
* **`ssg` (Static Site Generation)**: Pages are pre-rendered to static HTML files at build time.

### Global Route Rules
You can mix rendering strategies inside a single application by defining matching patterns in `auwla.config.ts` under `routeRules`:

```typescript
export default defineConfig({
  target: 'ssr', // Default fallback target

  routeRules: {
    // Compile all documentation pages statically at build time
    '/docs/**': { renderMode: 'ssg' },
    
    // Serve the admin panel purely client-side
    '/admin/**': { renderMode: 'spa' }
  }
});
```

---

## Custom Backends & Adapters

By default, Auwla handles the server request-response lifecycle automatically. However, you can change the target environment easily.

### The `server.entry` Option
If you want to bypass the automatic request routing and write your own custom Node.js, Bun, Express, or Hono server, set the `server.entry` single file path:

```typescript
export default defineConfig({
  target: 'ssr',
  server: {
    entry: './src/server.ts' // Custom server file path
  }
});
```

Vite will inject this entry file as a middleware during `npm run dev` so development and production environments run identical backend configurations.
