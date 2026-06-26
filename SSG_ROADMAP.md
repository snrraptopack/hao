# Auwla SSG (Static Site Generation) Roadmap

This document outlines the architectural roadmap for adding Static Site Generation (SSG) to the Auwla framework.

---

## 1. Overview & Architecture

Unlike modern React Server Components (RSC) or frameworks using complex async component setups, Auwla’s components are **strictly synchronous**. All asynchronous operations are handled before rendering at the route level via a `routed` loader function.

Because of this synchronous architecture, SSG is a natural extension of SSR (`renderToString`). SSG runs the exact same synchronous rendering pipeline as SSR, but executes it **at build time** instead of request time.

```
+---------------------------------------------------------------+
|                       Build Time (SSG)                        |
|                                                               |
| 1. Scan pages and detect `renderMode: 'ssg'`                  |
| 2. Run page `generatePaths()` to get all static route paths   |
| 3. For each path, execute page `routed()` (pre-fetch data)    |
| 4. Call `renderToString()` to generate static HTML            |
| 5. Serialize data cache into <script id="__AUWLA_DATA__">     |
| 6. Save static HTML to `dist/client/<path>/index.html`        |
+---------------------------------------------------------------+
                                |
                                v
+---------------------------------------------------------------+
|                      Runtime (Hydration)                      |
|                                                               |
| 1. Server serves static HTML file + JS bundle instantly       |
| 2. Client parses and populates `track` cache from <script>    |
| 3. Client `__hydrateTemplate` walks the existing DOM          |
| 4. Components resume execution synchronously with loaded data |
+---------------------------------------------------------------+
```

---

## 2. Page Configuration DX

Pages self-configure their rendering mode and declare dynamic paths via a static `config` export:

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router'
import { track } from 'auwla/events'

// Page render configuration
export const config = {
  renderMode: 'ssg',
  
  // Required for dynamic routes to generate static pages at build time
  async generatePaths() {
    // In a real application, you might fetch ids from an API or DB here
    return [
      { id: '1' },
      { id: '2' },
      { id: '3' }
    ]
  }
}

// Data fetched before page render (runs at build time for SSG)
export const routed = async (ctx: RouteContext<'/posts/:id'>) => {
  return await track.get('posts.getPost')
}

export default function PostDetail() {
  const data = getRouted(routed)
  return () => (
    <article>
      <h1>{data.value?.title}</h1>
      <p>{data.value?.content}</p>
    </article>
  )
}
```

---

## 3. Milestones & Phases

### Phase 1: Route Scanner Integration
* Update `src/vite-router/scanner.ts` to parse the `config` export from page files.
* Detect `renderMode` ('ssg' | 'ssr' | 'spa') and check for `generatePaths` function.
* Expose this configuration in the generated route manifest.

### Phase 2: Build-Time Generator Runner
* Build a Node/Bun CLI runner script (`scripts/build-ssg.ts`) that runs post-build.
* Load the server build/manifest.
* For each page marked as `ssg`:
  * If static route: render to string directly.
  * If dynamic route: execute `generatePaths()` to get all parameters, then render to string for each parameter set.
* Write the serialized track cache and compiled HTML output to `dist/client`.

### Phase 3: Hydration Path
* Reuse the hydration pipeline where the client reads the pre-fetched state from the document without making duplicate network requests.
