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
