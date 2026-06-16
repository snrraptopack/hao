# Auwla SSR

Server-side rendering for Auwla apps.

## Design

Auwla SSR is built around a minimal DOM shim that implements exactly the API surface the runtime and compiler runtime need (`document.createElement`, `template.content`, `cloneNode`, `Range`, etc.). The same render closures that run in the browser run on the server, so **compiled-mode components work out of the box**.

During SSR, `track.get()` / `track.post()` calls short-circuit through the server manifest and execute the server function directly — no HTTP round-trip. The renderer collects the promises created during a render pass, awaits them, and re-renders until the output is stable.

## API

### `renderToString(app, options?)`

Render an Auwla app to an HTML string.

```ts
import { renderToString } from 'auwla/ssr';
import { h } from 'auwla';
import App from './App';

const html = await renderToString(h(App), {
  request,
  manifest,
  path: '/posts',
});
```

Options:

- `request` — incoming `Request` (used for cookies, headers, etc.).
- `manifest` — server manifest produced by the Vite plugin.
- `load` — optional module loader; defaults to `import(modulePath)`.
- `path` — active route path.
- `params` — active route parameters.
- `maxFlush` — max async flush passes (default `10`).

### `createSsrFetchAdapter(options)`

A WinterCG-compatible fetch handler that serves RPC requests and renders HTML pages.

```ts
import { createSsrFetchAdapter } from 'auwla/ssr';

const handler = createSsrFetchAdapter({
  manifest,
  ssr: {
    app: h(App),
    template(html) {
      return `<!DOCTYPE html>
<html>
  <head><script type="module" src="/src/client.tsx"></script></head>
  <body>${html}</body>
</html>`;
    },
  },
});

export default {
  async fetch(request) {
    return handler(request);
  },
};
```

### `hydrate(options)`

Mount an app into an existing server-rendered root element on the client.

```ts
import { hydrate } from 'auwla/ssr';
import { h } from 'auwla';
import App from './App';

hydrate({ root: document.getElementById('app')!, app: h(App) });
```

> **Note:** full server-state transfer (avoiding duplicate data fetches on hydration) is not yet implemented.

## DOM environment

By default `renderToString` calls `installDomShim()`, which only installs globals when they are missing. In Node/Bun this activates the minimal shim. If you run inside jsdom, linkedom, or happy-dom, those implementations are used instead.

## Current limitations

- State transfer during hydration is not implemented; the client will re-run loaders/queries on mount.
- The shim intentionally does not implement the full DOM spec — only the operations Auwla uses.
