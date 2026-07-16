=<Header>
title: Page Exports
=</Header>

# Page Exports

Auwla routes use named exports inside page files (`src/pages/**/*.tsx`) to declare loading boundaries, authorization rules, static configurations, metadata, and rendering behaviors.

---

## Overview of Page Exports

The following named exports can be defined inside any page component file:

| Export | Type | Description |
| :--- | :--- | :--- |
| **`export default`** | `Component` | **Required.** The main page view component. |
| **`export const routed`** | `Function` | Data loader that runs to fetch backend dependencies before rendering the page. |
| **`export const pending`** | `Component` | Loading UI component displayed while `routed` is in-flight. |
| **`export const error`** | `Component` | Fallback component displayed if `routed` rejects or throws an error. |
| **`export const guard`** | `Function` | Authorization interceptor executing before `routed`. Can block/redirect navigation. |
| **`export const meta`** | `Object` | Static key-value metadata available to layouts and routers. |
| **`export const config`** | `Object` | Render mode overrides and dynamic paths generators. |

---

## 1. Page Component (`export default`)
The main view returned by the page route. It is written as a standard functional component returning JSX:

```tsx
export default function Home() {
  return <h1>Welcome to Auwla</h1>;
}
```

---

## 2. Data Loader (`export const routed`)
The `routed` export handles data loading. It is triggered during route transitions and resolves the data payload before the template mounts:

```tsx
import { type RouteContext } from 'auwla/router';
import { track } from 'auwla/track';

export const routed = async (ctx: RouteContext, signal: AbortSignal) => {
  return await track.get('posts.getPost', { id: ctx.params.id }, { signal });
};
```

---

## 3. Loading Fallback (`export const pending`)
A dedicated component displaying loading indicators or skeleton screens while the `routed` loader is executing:

```tsx
export function pending() {
  return <div class="skeleton-loader">Loading article data...</div>;
}
```

---

## 4. Error Fallback (`export const error`)
An error boundary component displayed if the `routed` loader fails or throws. It receives the thrown error object as an argument:

```tsx
export function error(err: Error) {
  return (
    <div class="error-panel">
      <h3>Failed to Load Data</h3>
      <p>{err.message}</p>
    </div>
  );
}
```

---

## 5. Navigation Guard (`export const guard`)
The `guard` function executes **before** `routed` data loaders run. It inspects parameters or user authentication states, allowing you to abort navigation (by returning `false`) or redirect immediately (by throwing a redirect response):

```tsx
import { type RouteContext } from 'auwla/router';

export const guard = async (ctx: RouteContext) => {
  const user = ctx.state.currentUser; // Access authenticated state

  if (!user) {
    // Redirect to login page immediately before fetching data
    throw ctx.redirect('/login');
  }

  if (!user.roles.includes('admin')) {
    // Abort navigation
    return false;
  }
  
  return true; // Proceed to data loading
};
```

---

## 6. Route Metadata (`export const meta`)
Static metadata containing key-value configurations. These parameters can be read inside layouts (e.g., to set document titles or select header styles):

```tsx
export const meta = {
  title: 'Dashboard Panel',
  requiresSidebar: true,
  theme: 'dark'
};
```

---

## 7. Render Configuration (`export const config`)
Overrides global targets and configures static pre-rendering setups:

```tsx
export const config = {
  renderMode: 'ssg', // 'spa' | 'ssr' | 'ssg'
  async generatePaths() {
    return [{ id: '1' }, { id: '2' }];
  }
};
```
