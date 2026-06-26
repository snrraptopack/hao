# Auwla Configuration

This directory contains the core schema and setup for `auwla.config.ts`.

Auwla allows you to cleanly separate your framework-level configuration from your bundler configuration (`vite.config.ts`).

## The Global Config File

To use the global config, create an `auwla.config.ts` file in the root of your project:

```typescript
import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'ssg', // Sets the default mode. Can be 'spa', 'ssr', or 'ssg'.
  
  directories: {
    pages: 'src/pages',
    server: 'src/server'
  }
});
```

And then pass it into your Vite plugins:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { auwla } from 'auwla/vite'
import { auwlaRouter } from 'auwla/vite-router'

export default defineConfig({
  plugins: [
    auwla(), // Magic! Automatically detects auwla.config.ts
    auwlaRouter() 
  ]
})
```

---

## Server Files: Route-Specific vs Shared

Auwla exposes functions exported from `.server.ts` files automatically as RPC endpoints. It scans for these files in **two** places:

### 1. `directories.pages` (Route-Specific Co-location)
You can place `.server.ts` files directly next to the `.tsx` page that uses them.
* **Example:** `src/pages/dashboard.tsx` and `src/pages/dashboard.server.ts`
* **Why?** It keeps backend logic explicitly tied to the UI that needs it. If you delete the page, you delete the backend logic with it. The generated RPC endpoint name automatically matches the page route.

### 2. `directories.server` (Global Shared Backend)
This folder (default: `src/server/`) is for backend logic that is used across *multiple* pages or doesn't belong to any specific route.
* **Example:** `src/server/auth.server.ts`, `src/server/db.server.ts`
* **Why?** Centralized utilities.

---

## The `directories.server` vs `server.entry` distinction

It is easy to confuse the `directories.server` option with the `server.entry` option. They do very different things:

* **`directories.server`**: This is a **folder** path. Auwla scans this folder to automatically turn your exported functions into RPC endpoints.
* **`server.entry`**: This is a **single file** path (e.g. `src/server.ts`). You ONLY use this if you want to bypass Auwla's automatic server infrastructure and write your own custom Node.js, Bun, or Express backend (e.g., using `app.listen(3000)`). If provided, Vite will inject your custom server file as a middleware during `npm run dev` so dev and production match perfectly.

---

## Hybrid Rendering (Global vs Per-File)

Auwla supports Hybrid Rendering. You can set a global `target` inside `auwla.config.ts` (e.g., `target: 'spa'`), but override it on a **per-page** basis!

```typescript
// src/pages/marketing/about.tsx

// Overrides the global 'spa' target. This specific page will be pre-rendered
// at build time (SSG), fetching data securely from its co-located .server file!
export const config = {
  renderMode: 'ssg'
};

export default function About() {
  return () => <div>Fast Static HTML!</div>
}
```

---

## Global Route Rules

Instead of configuring the render mode on a per-file basis, you can define global matching rules inside `auwla.config.ts` using the `routeRules` option. This is ideal for applying rendering strategies to entire sections of your application:

```typescript
import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'ssr', // default render mode

  routeRules: {
    // Render all docs statically using SSG
    '/docs/**': { renderMode: 'ssg' },
    // Render admin dashboard purely client-side (SPA)
    '/admin/**': { renderMode: 'spa' },
  }
});
```

The route patterns support standard wildcards (`*` for a single segment, `**` for recursive matches) and are fully type-safe, offering IDE auto-completion for your defined paths while still permitting flexible patterns.
