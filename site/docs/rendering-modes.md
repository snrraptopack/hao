# Rendering Modes

Auwla supports flexible rendering architectures, allowing you to configure rendering modes globally or override them on a per-page level.

---

## Supported Modes

* **`spa`** (Single Page Application): Pages are rendered dynamically on the client. This is the default mode and is ideal for admin panels or highly interactive dashboards.
* **`ssr`** (Server-Side Rendering): Pages are pre-rendered on the server for every request, delivering pre-rendered HTML to the browser before hydrating. This is best for landing pages and content requiring SEO.
* **`ssg`** (Static Site Generation): Pages are compiled into static HTML files during the build phase (`npm run build`). This is best for blogs, documentation, or marketing sites.

---

## Page-Level Configuration (`export const config`)

You can define a page's rendering mode by exporting a static `config` object from its template file:

```tsx
// src/pages/about.tsx

// Define render mode for this page specifically
export const config = {
  renderMode: 'ssr' // Override default target
};

export default function About() {
  return <h1>About Us</h1>;
}
```

---

## Pre-Bundling Dynamic Routes (`generatePaths`)

For dynamic parameterized routes (such as `/posts/[id].tsx`), static generation (`ssg`) requires knowing which IDs or slugs to compile at build time. 

You pre-bundle these pages by specifying a **`generatePaths()`** function inside your `config` object. This function returns an array of segment objects that map to the route parameters:

```tsx
// src/pages/posts/[id].tsx
import { getRouted, type RouteContext } from 'auwla/router';
import { track } from 'auwla/track';

// 1. Configure SSG and pre-bundle target parameters
export const config = {
  renderMode: 'ssg',
  async generatePaths() {
    // Generate static pages for post IDs 1, 2, and 3 at build time
    return [
      { id: '1' },
      { id: '2' },
      { id: '3' }
    ];
  }
};

// 2. Fetch the data for each static path
export const routed = async (ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) => {
  return await track.get('posts.getPost', { id: ctx.params.id }, { signal });
};

export default function PostView() {
  const query = getRouted(routed);
  
  return (
    <article>
      <h1>{query?.value?.title}</h1>
      <p>{query?.value?.content}</p>
    </article>
  );
}
```

During build:
1. Auwla's Vite compiler scans `config.generatePaths()`.
2. It generates URLs for each entry: `/posts/1`, `/posts/2`, and `/posts/3`.
3. It executes the `routed` functions, resolves the data, runs the SSR renderer, and outputs static HTML files directly inside your `dist/` directory.
