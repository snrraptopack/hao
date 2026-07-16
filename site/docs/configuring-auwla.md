=<Header>
title: Configuring Auwla
=</Header>

# Configuring Auwla

Auwla allows you to manage framework behaviors, folder structures, compilation rules, and rendering targets through a centralized config file in your project root.

To configure your project, create an `auwla.config.ts` file in your project root:

```typescript
// auwla.config.ts
import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'spa', // Global default rendering mode
  directories: {
    pages: 'src/pages',
    server: 'src/server'
  }
});
```

To wire this into your builder, import the plugins in your Vite configuration:

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

## Default Configuration

If no `auwla.config.ts` file exists or options are omitted, Auwla applies the following default configuration:

```typescript
{
  target: 'spa',
  directories: {
    pages: 'src/pages',
    server: 'src/server',
    manifest: '.auwla'
  },
  router: {
    lazy: false,
    genFile: 'src/auwla.gen.ts',
    extensions: ['.tsx', '.ts', '.jsx', '.js']
  },
  compiler: {
    css: true
  }
}
```

---

## Configuration Reference

Below is the complete reference of all configuration properties, types, default values, and explanations:

### Root Options

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`target`** | `'spa' \| 'ssr' \| 'ssg' \| 'islands' \| 'island'` | `'spa'` | The default rendering target for all pages. |
| **`routeRules`** | `Record<RoutePattern, RouteRule>` | `{}` | Per-route pattern render overrides using glob matches (e.g. `'/docs/**': { renderMode: 'ssg' }`). Supports wildcards (`*`, `**`). |

---

### `directories` Options
Manages folder structures scanned for routes and compilation assets.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`pages`** | `string` | `'src/pages'` | Directory containing client-side page components. File paths inside this folder determine page routes. |
| **`server`** | `string` | `'src/server'` | Directory containing global shared server-side functions and RPC endpoints. |
| **`manifest`** | `string` | `'.auwla'` | Internal directory where generated client/server manifests and types are written during build. |

---

### `server` Options
Controls how custom servers are registered.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`entry`** | `string` | `undefined` | Absolute or relative path to a custom server entry file (e.g. `'src/server.ts'`). Used when bypassing Auwla's auto-generated server bootstrap scripts to configure your own Hono, Bun, or Express adapter. |

> [!NOTE]
> **Difference between `directories.server` and `server.entry`:**
> *   **`directories.server`** is a folder scanned for RPC functions.
> *   **`server.entry`** is a single file wrapper running the HTTP server wrapper.

---

### `router` Options
Controls client-side navigation routing behaviors.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`lazy`** | `boolean` | `false` | Enables client-side page file lazy loading and code-splitting via dynamic imports. If `false`, pages are bundled statically. |
| **`genFile`** | `string` | `'src/auwla.gen.ts'` | Location where the TypeScript route type-declarations file is auto-written for type safety. |
| **`extensions`** | `string[]` | `['.tsx', '.ts', '.jsx', '.js']` | File extensions scanned inside `directories.pages` to resolve page routes. |

---

### `compiler` Options
Modifies compilation and bundling filters.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`css`** | `boolean` | `true` | Toggle whether the Auwla compiler automatically bundles and injects compiled CSS styles. |
| **`include`** | `RegExp` | `undefined` | Regular expression pattern specifying files to explicitly compile. |
| **`exclude`** | `RegExp` | `undefined` | Regular expression pattern specifying files to exclude from compile passes. |
| **`debugFlag`** | `boolean \| string` | `undefined` | Toggles rendering compiler debug logs and performance metrics during build. |

---

## Render Target Resolution Priority

Auwla resolves rendering modes in the following priority order (highest to lowest):

1.  **Page-Level Config** (`export const config = { renderMode: 'ssg' }`) inside the page file.
2.  **Route Rules** (`routeRules: { '/docs/**': { renderMode: 'ssg' } }`) defined in `auwla.config.ts`.
3.  **Global Target** (`target: 'ssr'`) defined in `auwla.config.ts`.
4.  **Auwla Default** (`'spa'`).
