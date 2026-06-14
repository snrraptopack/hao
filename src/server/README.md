# Auwla Server Runtime

This directory contains the server-side runtime for Auwla fullstack apps. It is never imported by client code.

## Files

- `types.ts` — shared types: `ServerContext`, `Middleware`, `RemoteFunction`, `ServerManifest`.
- `context.ts` — request-scoped context via `AsyncLocalStorage`.
- `pipeline.ts` — middleware definition and execution.
- `remote.ts` — `remote.get` / `remote.post` helpers for declaring remote functions.
- `validate.ts` — `validate(schema)` middleware for Standard Schema libraries.
- `index.ts` — public API.

## Declaring remote functions

Remote functions live in `.server.ts` files. They are discovered by the Vite plugin and exposed as typed RPC endpoints.

### Plain functions default to GET

```ts
// src/pages/posts/index.server.ts
export async function getPosts(): Promise<Post[]> {
  return db.post.findMany()
}
```

### Explicit GET with middleware

```ts
import { remote, defineMiddleware } from 'auwla/server'

const log = defineMiddleware(async (ctx, next) => {
  console.log(ctx.request.url)
  return next()
})

export const getPosts = remote.get([log], async () => {
  return db.post.findMany()
})
```

### POST mutations

```ts
import { remote, validate } from 'auwla/server'
import * as v from 'valibot'

const schema = v.object({ title: v.string() })

export const createPost = remote.post(
  [validate(schema)],
  async (ctx) => {
    const { title } = ctx.locals.input as { title: string }
    return db.post.create({ title })
  }
)
```

## Request context

Inside any remote function or middleware you can read the request context:

```ts
import { getContext, getParams } from 'auwla/server'

export async function getPost() {
  const { request, params, locals } = getContext()
  const { id } = getParams('/posts/:id') // same API as the client router
  return db.post.findById(id)
}
```

`getContext()` throws if called outside of `runWithContext()`.

## Middleware

Middleware is a function that receives `ctx` and `next`. Call `next()` to continue to the next middleware or the handler.

```ts
import { defineMiddleware } from 'auwla/server'

export const auth = defineMiddleware(async (ctx, next) => {
  const user = await getUser(ctx.request)
  if (!user) throw ctx.redirect('/login')
  ctx.locals.user = user
  return next()
})
```

Use `remote.get([auth], handler)` or `remote.post([auth, validate(schema)], handler)` to attach middleware.

## Validation

`validate(schema)` parses the request body as JSON and validates it with a Standard Schema library (Zod, Valibot, etc.). The validated value is stored in `ctx.locals.input`.

```ts
import { validate } from 'auwla/server'
import * as v from 'valibot'

const schema = v.object({ title: v.string() })

export const createPost = remote.post(
  [validate(schema)],
  async (ctx) => {
    const { title } = ctx.locals.input
    // ...
  }
)
```

If validation fails, a `ValidationError` is thrown.

## File location rules

- `src/pages/**/*.server.ts` — remote functions scoped to a route.
- `src/server/**/*.server.ts` — shared remote functions with no route scope.

Route params are typed based on the file path:

| File | Params type |
|---|---|
| `posts/index.server.ts` | `Record<string, never>` |
| `posts/[id].server.ts` | `{ id: string }` |
| `posts/[...slug].server.ts` | `{ slug: string[] }` |

## Server manifest

The server manifest is the bridge between the client and the server. The Vite
plugin scans every `.server.ts` file and produces a JSON/JS module that tells
the adapter:

- which module and export to load for each remote key
- the declared HTTP method (`GET` / `POST`)
- the route pattern so params can be extracted from the current `routePath`
- the ordered param names and TypeScript type strings for the generated types

You never edit it by hand. In development it is served as the virtual module
`auwla:server-manifest`; in production the plugin writes `.auwla/server-manifest.js`.

## RPC flow

1. Client calls `track.get('posts.getPost')` or `track.post('posts.createPost').run(data)`.
2. Client sends `{ key, args, routePath }` to `POST /_auwla/rpc`.
3. Adapter looks up the manifest entry.
4. Adapter extracts params from `routePath` using the entry's `routePattern`.
5. Adapter builds `ServerContext`, runs middleware, and calls the function.
6. Result is serialized as JSON and returned.

## Security & Reliability Safeguards

Auwla includes built-in security features to protect fullstack entrypoints:

### CSRF Protection
Auwla verifies `Origin` and `Referer` headers on all incoming POST requests (mutations) to block Cross-Site Request Forgery. Programmatic background fetches also supply an explicit `accept: application/json` header to strictly segment RPC traffic from standard navigation form posts.

### Prototype Pollution Protection
The manifest lookup utilizes `Object.hasOwn` rather than direct object indexing, preventing attackers from accessing prototype properties (like `__proto__` or `constructor`) and crashing the server process.

### Error Sanitization
In production (`process.env.NODE_ENV === 'production'`), generic runtime exceptions are sanitized to return `'Internal Server Error'` to prevent exposing internal stack traces, DB connection strings, or system paths. Validation errors (`ValidationError`) are still cleanly sent to the browser for client feedback.

### Middleware Double-Invocation Guard
To protect against state-corruption or duplicate mutation triggers, calling `next()` twice in the same middleware function will immediately throw a runtime error.
