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

```ts
import { Hono } from 'hono'
import { createHonoAdapter } from 'auwla/adapters/hono'
import manifest from './.auwla/server-manifest'

const app = new Hono()
app.use('/_auwla/rpc', createHonoAdapter({ manifest }))
```

No runtime dependency on Hono is introduced; the adapter uses structural
typing so it mounts directly into a Hono app.

## Bun

```ts
import { createBunAdapter } from 'auwla/adapters/bun'
import manifest from './.auwla/server-manifest'

Bun.serve({ fetch: createBunAdapter({ manifest }) })
```

Non-RPC requests fall through to a `404` response.

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
