# Server Functions

Auwla provides a type-safe RPC system that lets you define server-only code and call it from the client with full autocomplete support, without importing server-only packages (like databases or secrets) into your client bundles.

---

## Setting Up Server Files

Any file in your project ending in `.server.ts` is designated as server-only. Exports from these files are scanned at build time to register RPC endpoints.

```typescript
// src/pages/posts/index.server.ts
import { remote, getParams } from 'auwla/server';
import { db } from '../../db';

// Define a GET endpoint
export const getPosts = remote.get(async () => {
  return await db.posts.findMany();
});

// Define a POST endpoint
export const createPost = remote.post(async (ctx) => {
  const { title, content } = ctx.locals.input as { title: string; content: string };
  return await db.posts.create({ data: { title, content } });
});
```

---

## Calling Server Functions from the Client

You call server functions using Auwla's `track` events API, specifying the generated key formatted as `fileName.exportName`:

```tsx
import { track } from 'auwla/events';

// 1. Establish track binding
const posts = track.get('posts.getPosts');

function PostFeed() {
  return () => (
    <div>
      <h2>Feed</h2>
      
      {posts.pending && <p>Loading articles...</p>}
      
      {posts.resolved && (
        <div class="list">
          {posts.value.map((p: any) => (
            <div key={p.id} class="item">
              <h3>{p.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Middleware & Input Validation

Server functions can take an array of middleware functions. For example, you can validate inputs using schema validation libraries:

```typescript
import { remote, validate } from 'auwla/server';
import * as v from 'valibot';

const schema = v.object({
  title: v.string(),
  content: v.string()
});

export const createPost = remote.post(
  [validate(schema)], // Middleware run before handler
  async (ctx) => {
    const { title, content } = ctx.locals.input;
    return await db.posts.create({ data: { title, content } });
  }
);
```

---

## Form Submissions with `track.form`

Auwla makes form handling clean by allowing you to bind forms directly to POST server functions using `track.form`. This automatically intercepts form submissions, performs validation, calls the RPC endpoint, and tracks loading and error states:

```tsx
import { track } from 'auwla/events';

function NewPostForm() {
  const create = track.form('posts.createPost');

  return () => (
    <form onSubmit={create.onSubmit}>
      <input type="text" name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content..." required />
      
      <button type="submit" disabled={create.pending}>
        {create.pending ? 'Saving...' : 'Save Post'}
      </button>

      {create.error && <p class="error">{create.error.message}</p>}
      {create.resolved && <p class="success">Saved post successfully!</p>}
    </form>
  );
}
```

---

## Mounting the RPC Server Adapter

In production, you own the server execution environment. Connect your HTTP server to Auwla by mounting the built-in adapters at `/_auwla/rpc`:

### Bun
```typescript
import { auwlaRpc } from 'auwla/adapters/bun';

Bun.serve({
  port: 3000,
  fetch: auwlaRpc()
});
```

### Hono
```typescript
import { Hono } from 'hono';
import { auwlaRpc } from 'auwla/adapters/hono';

const app = new Hono();
app.use('/_auwla/*', auwlaRpc());
```

### Express
```typescript
import express from 'express';
import { auwlaRpc } from 'auwla/adapters/express';

const app = express();
app.use('/_auwla', auwlaRpc());
```

> [!NOTE]
> During development, `vite dev` runs the router middleware automatically. You do not need to boot a separate server to test server functions locally.
