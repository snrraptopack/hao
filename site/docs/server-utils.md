# Server Utilities

Auwla provides server-side helper functions, contextual getters, request parsers, and semantic error classes under the `'auwla/server'` namespace to streamline backend development, prevent parameter drilling, and manage errors cleanly.

---

## Context Retrieval Helpers (ALS)

While remote functions receive a `ctx` argument directly, passing `ctx` down through multiple layers of database models, authorization checks, or business logic creates boilerplate. 

Auwla uses Asynchronous Local Storage (ALS) to make request details accessible from anywhere in the current execution thread.

### 1. `getContext`
Retrieves the full active `ServerContext` of the active request thread:

```typescript
import { getContext, ForbiddenError } from 'auwla/server';

export async function verifyUserPermission(action: string) {
  // Access the context anywhere without parameter drilling
  const ctx = getContext();
  const user = ctx.locals.user;
  
  if (!user || !user.permissions?.includes(action)) {
    throw new ForbiddenError(`User lacks permission to: ${action}`);
  }
}
```

### 2. `getParams`
Retrieves path parameters for the current route. By passing the route path as an argument, Auwla automatically resolves and types the route segments:

```typescript
import { getParams } from 'auwla/server';

export async function fetchCurrentPost() {
  // Pass your route pattern for full type-safety and IDE autocompletion!
  const params = getParams('/posts/:id');
  const id = params.id; // Automatically inferred as string
  
  return await db.posts.findUnique({ where: { id } });
}
```

---

## Server Context API Reference (`ServerContext`)

The `ServerContext` object contains properties representing the active request, middleware-passed locals, cookie control, and header overrides:

*   **`ctx.request`** (`Request`): The standard WinterCG/Web Request representation of the incoming request.
*   **`ctx.locals`** (`Record<string, any>`): A request-scoped container for storing values passed by middlewares (e.g. `ctx.locals.user`).
*   **`ctx.headers`** (`Headers`): Standard Response headers. You can append or set headers here to be returned in the outgoing RPC response.
*   **`ctx.cookies`**: An interface to manage client cookies:
    *   `get(name: string): string | undefined` — Reads a cookie value.
    *   `set(name: string, value: string, options?: CookieOptions): void` — Writes a cookie. Options include `httpOnly`, `secure`, `sameSite`, `path`, `maxAge`, and `expires`.
    *   `delete(name: string, options?: CookieOptions): void` — Deletes a cookie.
*   **`ctx.redirect(path: string): Response`**: Returns a redirect Response structure.
    > [!IMPORTANT]
    > **Throwing redirects:** The recommended and cleanest way to redirect the browser from inside a remote function or custom middleware is to **throw** the redirect Response:
    > ```typescript
    > throw ctx.redirect('/login');
    > ```

### Redirect and Cookie Usage Example:
```typescript
// src/pages/auth/logout.server.ts
import { remote } from 'auwla/server';

export const logout = remote.post(async (ctx) => {
  // 1. Delete session cookie
  ctx.cookies.delete('session_id', { path: '/' });

  // 2. Redirect to landing page by throwing
  throw ctx.redirect('/');
});
```

---

## Payload Parsing & Context Running

### 1. `parseBody`
Parses incoming requests dynamically. It checks the request headers and automatically parses the request body as JSON or `FormData` depending on the content type:

```typescript
import { parseBody } from 'auwla/server';

export async function handleRawPayload(request: Request) {
  // Returns parsed JSON object or FormData instance
  const data = await parseBody(request);
  return data;
}
```

### 2. `runWithContext`
Wraps synchronous or asynchronous executions inside a mock or custom `ServerContext`. This is extremely useful for writing server adapter wrappers, running test suites, or seeding databases offline:

```typescript
import { runWithContext, type ServerContext } from 'auwla/server';

// Create a custom/mock server context
const mockContext = {
  request: new Request('http://localhost/api/test'),
  params: { id: 'test-id' },
  locals: { user: { id: 'admin', permissions: ['delete'] } },
  headers: new Headers(),
  cookies: { /* ... */ }
} as unknown as ServerContext;

// Run operations within the active ALS context
await runWithContext(mockContext, async () => {
  // Any nested helper calling getContext() or getParams() will receive mockContext!
  const data = await fetchCurrentPost();
});
```

---

## Semantic HTTP Errors

Auwla exports semantic error classes that map directly to standard HTTP status codes. When thrown inside your server functions or middlewares, they are caught by the adapter and returned to the client as clean RPC responses with the appropriate status codes.

### Available Error Classes

| Class | HTTP Status | Description |
| :--- | :--- | :--- |
| **`BadRequestError`** | `400` | Input errors or bad requests. |
| **`UnauthorizedError`** | `401` | Missing or invalid authentication credentials. |
| **`ForbiddenError`** | `403` | User authenticated but lacks permissions to execute. |
| **`NotFoundError`** | `404` | Requested record or page does not exist. |
| **`HttpError`** | *Custom* | Base class to throw arbitrary status codes (e.g. `new HttpError(418, "I'm a teapot")`). |

### Example Usage:

```typescript
// src/pages/posts/[id].server.ts
import { remote, NotFoundError, UnauthorizedError, ForbiddenError } from 'auwla/server';
import { db } from '../../db';

export const deletePost = remote.post(async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    throw new UnauthorizedError('Authentication is required to perform this action.');
  }

  const post = await db.posts.findUnique({ where: { id: ctx.params.id } });
  if (!post) {
    throw new NotFoundError(`Post with ID ${ctx.params.id} could not be found.`);
  }

  if (post.authorId !== user.id) {
    throw new ForbiddenError('You can only delete your own posts.');
  }

  await db.posts.delete({ where: { id: ctx.params.id } });
  return { success: true };
});
```
