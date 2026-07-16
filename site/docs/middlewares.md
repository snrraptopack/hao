=<Header>
title: Middlewares
=</Header>

# Middlewares

Auwla includes a type-safe middleware pipeline to run interceptors (such as logging, database connection setup, authentication, or input validations) around your server functions.

---

## Defining Middlewares (`defineMiddleware`)

Import `defineMiddleware` from `'auwla/server'` to create custom handlers. A middleware function receives the server `RouteContext` and a `next` callback returning a promise:

```typescript
// src/middlewares/auth.ts
import { defineMiddleware, UnauthorizedError } from 'auwla/server';
import { db } from '../db';

export const auth = defineMiddleware(async (ctx, next) => {
  const token = ctx.request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new UnauthorizedError('Missing authentication token.');
  }

  const session = await db.sessions.findUnique({ where: { token } });
  if (!session) {
    throw new UnauthorizedError('Session has expired.');
  }

  // 1. Store the authenticated user in local context
  ctx.locals.user = session.user;

  // 2. Execute the next handler in the pipeline
  return next();
});
```

---

## Type-Safe Locals (`ctx.locals`)

The `ctx.locals` object is a shared container passed through the middleware pipeline. 

When you populate fields on `ctx.locals` inside a middleware, the TypeScript compiler automatically propagates and infers these types inside subsequent middlewares and the final server function handler, removing the need for manual casting:

```typescript
// src/pages/dashboard.server.ts
import { remote } from 'auwla/server';
import { auth } from '../middlewares/auth';

export const getStats = remote.get([auth], async (ctx) => {
  // ✅ Fully typed: ctx.locals.user is automatically inferred as User type!
  const user = ctx.locals.user;
  return { userId: user.id, data: [] };
});
```

---

## Built-in Validation Middleware (`validate`)

Auwla provides a built-in `validate(schema)` middleware helper imported from `'auwla/server'` to handle request payload validations easily.

It accepts any standard validator schema (Zod, Valibot, etc.) and performs the following lifecycle automatically:
1. Parses the incoming request body as JSON.
2. Validates the parsed object against the provided schema.
3. Stores the validated value directly inside **`ctx.locals.input`** with full type safety.
4. If validation fails, it automatically throws a `ValidationError` which returns a `400 Bad Request` HTTP error status to the client.

```typescript
import { remote, validate } from 'auwla/server';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const createUser = remote.post(
  [validate(registerSchema)], 
  async (ctx) => {
    // ✅ Fully typed: ctx.locals.input is inferred as { username: string; password: string }
    const { username, password } = ctx.locals.input;
    return { success: true, username };
  }
);
```

---

## Composing Middlewares (`composeMiddleware`)

You can bundle multiple middlewares into a single reusable pipe using `composeMiddleware`. This is useful for combining common patterns (like authenticating a request and validating its body schema) while maintaining type-safe locals:

```typescript
import { composeMiddleware, validate } from 'auwla/server';
import { auth } from './auth';
import { z } from 'zod';

const postSchema = z.object({ title: z.string() });

// Compose auth and body schema validation into a single pipeline
export const authAndValidate = composeMiddleware(
  auth,
  validate(postSchema)
);

// Consume the composed pipeline
export const createPost = remote.post([authAndValidate], async (ctx) => {
  const user = ctx.locals.user; // Typed from auth middleware
  const input = ctx.locals.input; // Typed from validate middleware
  // ...
});
```

---

## Registering Middlewares

You can register middlewares at two levels:

### 1. Route-Specific Middlewares
Pass an array of middlewares as the first parameter to `remote.get` or `remote.post`:

```typescript
export const updateSettings = remote.post([auth, auditLogger], async (ctx) => {
  // Runs auth first, then auditLogger, then this handler
});
```

### 2. Global Adapter-Level Middlewares
Register middlewares globally inside your server entry adapter (e.g. `src/server.ts`). These will execute around **every** remote server function in the application (useful for global request loggers, CORS setups, or database transaction rollbacks):

```typescript
// src/server.ts
import { createFetchAdapter } from 'auwla/adapters/fetch';
import { defineMiddleware } from 'auwla/server';
import manifest from 'auwla:server-manifest';

// A simple global request logger
const globalLogger = defineMiddleware(async (ctx, next) => {
  const start = Date.now();
  try {
    return await next();
  } finally {
    console.log(`[RPC] ${ctx.route.path} resolved in ${Date.now() - start}ms`);
  }
});

export default {
  fetch: createFetchAdapter({
    manifest,
    middlewares: [globalLogger] // Applied to every remote function call
  })
};
```

---

## Platform Context Injection (`ctx.platform`)

Adapters automatically forward platform-specific request contexts (like Hono contexts or Bun request details) into the server `ctx.platform` property:

* **Hono**: `ctx.platform.hono` contains the full Hono Context (`c`).
* **Bun**: `ctx.platform.bun` contains `{ request }`.
* **Vite (Dev mode)**: `ctx.platform.vite` contains `{ server, req, res }`.

You can access these platform properties inside your middlewares or remote functions to read session states or configure cookies:

```typescript
export const getGeoIP = remote.get(async (ctx) => {
  // Access Hono context if deployed on Hono
  const honoCtx = ctx.platform?.hono;
  if (honoCtx) {
    const ip = honoCtx.req.header('x-forwarded-for');
    return { ip };
  }
  return { ip: 'unknown' };
});
```
