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
    // ctx.locals.input is automatically typed as { title: string }
    const { title } = ctx.locals.input
    return db.post.create({ title })
  }
)
```

## Request context

Inside any remote function or middleware you can read the request context:

```ts
import { getContext, getParams } from 'auwla/server'

export async function getPost() {
  const { request, params, locals, headers, cookies } = getContext()
  const { id } = getParams('/posts/:id') // same API as the client router
  return db.post.findById(id)
}
```

`getContext()` throws if called outside of `runWithContext()`.

### Cookies and Custom Headers

`ServerContext` provides standard-compliant, platform-agnostic headers and cookies helpers. Any cookies or custom headers set here are automatically merged into the final `Response` returned to the client.

```ts
import { remote } from 'auwla/server'

export const login = remote.post(async (ctx) => {
  // Read a cookie
  const sessionToken = ctx.cookies.get('session_id')

  // Set a cookie
  ctx.cookies.set('session_id', 'new-token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 // 1 day
  })

  // Delete a cookie
  ctx.cookies.delete('old_token')

  // Set custom response headers
  ctx.headers.set('Cache-Control', 'no-store')

  return { success: true }
})
```

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

### Composing Middleware

You can use `composeMiddleware` to bundle multiple middlewares into a single middleware while preserving type safety and locals type propagation:

```ts
import { composeMiddleware, validate } from 'auwla/server'

export const authAndValidate = composeMiddleware(
  auth,
  validate(schema)
)

export const createPost = remote.post([authAndValidate], async (ctx) => {
  // Both ctx.locals.user and ctx.locals.input are fully typed!
})
```

## Validation

`validate(schema)` parses the request body as JSON and validates it with a Standard Schema library (Zod, Valibot, etc.). The validated value is stored in `ctx.locals.input`.

```ts
import { validate } from 'auwla/server'
import * as v from 'valibot'

const schema = v.object({ title: v.string() })

export const createPost = remote.post(
  [validate(schema)],
  async (ctx) => {
    // Automatically inferred as { title: string }
    const { title } = ctx.locals.input
    // ...
  }
)
```

If validation fails, a `ValidationError` is thrown.

## Error Handling

Auwla provides semantic HTTP error classes that developers can throw inside remote functions or middleware. These automatically translate into the correct HTTP status code in the RPC response:

```ts
import { remote, UnauthorizedError, NotFoundError } from 'auwla/server'

export const getPost = remote.get(async (ctx) => {
  const user = ctx.locals.user
  if (!user) {
    throw new UnauthorizedError('You must be logged in')
  }

  const post = await db.posts.findById(ctx.params.id)
  if (!post) {
    throw new NotFoundError('Post not found')
  }

  return post
})
```

Available HTTP error classes:
- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `HttpError` (generic base class for custom statuses, e.g. `new HttpError(418, "I'm a teapot")`)


## File location rules

- `src/pages/**/*.server.ts` — remote functions scoped to a route.
- `src/server/**/*.server.ts` — shared remote functions with no route scope.

Route params are typed based on the file path:

| File | Params type |
|---|---|
| `posts/index.server.ts` | `Record<string, never>` |
| `posts/[id].server.ts` | `{ id: string }` |
| `posts/[...slug].server.ts` | `{ slug: string[] }` |

## Internal Server Modules vs. Public RPC Endpoints

To keep your server architecture secure and clean, you should distinguish between files that define public RPC API endpoints and files that initialize internal server resources (like databases or third-party email clients).

### The Convention
- **Use `*.server.ts`** ONLY for files that define public remote functions (`remote.get` / `remote.post`) that the browser client is allowed to call.
- **Use plain `*.ts`** for files that configure internal server resources (like `src/server/db.ts` or `src/server/email.ts`). These are never scanned by Auwla, keeping their exports private to the server.

### Example Architecture

1. **Internal Server Resource (`src/server/db.ts`):**
```ts
import { PrismaClient } from '@prisma/client'
// Not scanned for RPC, completely private to the server
export const db = new PrismaClient()
```

2. **Public RPC Action (`src/pages/posts/index.server.ts`):**
```ts
import { remote } from 'auwla/server'
import { db } from '../../server/db' // Import internal resource

// Scanned and exposed as a public RPC endpoint
export const getPosts = remote.get([], async () => {
  return db.post.findMany()
})
```

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
