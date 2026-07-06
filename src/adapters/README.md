# Auwla adapters

These adapters turn the Auwla RPC transport into a server request handler.
All adapters are thin wrappers around the WinterCG-compliant `fetch` adapter.

## `createFetchAdapter`

The core adapter. It expects a `POST` request at `/_auwla/rpc`, resolves the
remote key from the manifest, extracts route params from the current route
path, runs the server function (and any middleware) inside an
`AsyncLocalStorage` context, and returns the serialized result.

```ts
import { createFetchAdapter } from 'auwla/adapters/fetch'
import manifest from './.auwla/server-manifest'

const handle = createFetchAdapter({ manifest })

// WinterCG runtime
export default { fetch: handle }
```

### Options

- `manifest` — runtime server manifest (`auwla:server-manifest`).
- `load(modulePath)` — optional module loader. Defaults to `import()`.
- `rpcPath` — RPC endpoint path, defaults to `/_auwla/rpc`.
- `onError(error, request)` — optional error logger.
- `middlewares` — array of global middlewares executed around every remote function.

### Global Middlewares Example

Global middlewares allow you to register common audit or setup logic (such as logging, request tracking, or database session management) once at the adapter level:

```ts
import { createFetchAdapter } from 'auwla/adapters/fetch'
import { defineMiddleware } from 'auwla/server'
import manifest from './.auwla/server-manifest'

const globalLogger = defineMiddleware(async (ctx, next) => {
  console.log(`[RPC] Invoking: ${ctx.route.path}`)
  return next()
})

const handle = createFetchAdapter({
  manifest,
  middlewares: [globalLogger]
})
```

## Hono

Install Hono in your project first:

```bash
bun add hono   # or: npm install hono
```

### Zero-config (Bun / Node.js)

`createHonoAdapter()` with no arguments automatically lazy-loads routes and the
server manifest from the Auwla virtual modules at runtime. It handles both RPC
requests and SSR page rendering out of the box:

```ts
import { Hono } from 'hono'
import { createHonoAdapter } from 'auwla/adapters/hono'

const app = new Hono()
app.use('*', createHonoAdapter())
```

### Static file serving

Hono does not serve static files automatically — you must add platform-specific
static middleware **before** the Auwla adapter so your built JS/CSS assets are
reachable:

| Platform | Static middleware |
|---|---|
| **Bun** | `import { serveStatic } from 'hono/bun'` |
| **Node.js** | `import { serveStatic } from '@hono/node-server/serve-static'` |
| **Deno** | `import { serveStatic } from 'hono/deno'` |
| **Cloudflare Workers** | Handled by the CDN / Workers Static Assets — no middleware needed |

```ts
import { serveStatic } from 'hono/bun' // swap for your platform

app.use('/assets/*', serveStatic({ root: './dist' }))
app.use('*', createHonoAdapter())
```

### Server entry per runtime

The way you start the HTTP server differs per runtime. `createHonoAdapter()`
returns a standard Hono middleware and works the same in all cases — only the
bootstrap differs:

**Bun** — uses Bun's native export shape:
```ts
export default { port: 3000, fetch: app.fetch }
```

**Node.js** — requires `@hono/node-server`:
```ts
import { serve } from '@hono/node-server'
serve({ fetch: app.fetch, port: 3000 })
```

**Deno**:
```ts
Deno.serve({ port: 3000 }, app.fetch)
```

**Cloudflare Workers** — export the app directly, no port needed:
```ts
export default app
```

### Edge platforms (Cloudflare Workers, Deno Deploy)

Edge runtimes have no filesystem access. Pass `routes` and `template` explicitly
so the adapter can render SSR pages without reading from disk:

```ts
import { createHonoAdapter } from 'auwla/adapters/hono'
import routes from 'auwla:routes'
import manifest from 'auwla:server-manifest'

// Pre-fetch your HTML shell at build time (e.g. via an asset binding or inline string)
const template = await env.ASSETS.fetch('/index.html').then(r => r.text())

const app = new Hono()
app.use('*', createHonoAdapter({ routes, manifest, template }))

export default app
```

No runtime dependency on Hono is introduced in the Auwla package — the adapter
uses structural typing and mounts cleanly into any Hono app.


## Bun

`createBunAdapter()` with no arguments is zero-config — it lazy-loads routes,
the server manifest, and the HTML template automatically. It handles RPC, SSR,
and static asset serving out of the box:

```ts
import { createBunAdapter } from 'auwla/adapters/bun'

const port = Number(process.env.PORT ?? 3000)

// Bun reads the `export default { port, fetch }` shape natively
export default {
  port,
  fetch: createBunAdapter(),
}
```

Non-RPC, non-SSR requests (unknown routes) fall through to a `404` response.


## Express

The Express adapter is intentionally deferred. Express handlers use `req`/`res`
instead of WinterCG `Request`/`Response`, and the request stream is usually
consumed by body-parser before the adapter can read the raw body. A shim
adapter will be added later; for now use `createFetchAdapter` or
`createHonoAdapter`.

## Platform Context Injection

To prevent reinventing security, session management, or rate limiting inside Auwla, the framework adapters expose native platform parameters under `ctx.platform` inside remote handlers.

When mounting the adapter, it automatically injects:
- **Hono**: `ctx.platform.hono` contains the full Hono Context (`c`).
- **Bun**: `ctx.platform.bun` contains `{ request }`.
- **Vite (Dev mode)**: `ctx.platform.vite` contains `{ server, req, res }`.

Example: Accessing a session user set by Hono Auth middleware:
```ts
export const getDashboard = remote.get([], async (ctx) => {
  const user = ctx.platform?.hono?.get('user')
  if (!user) throw new Error('Unauthorized')
  return { stats: getStatsForUser(user.id) }
})
```
