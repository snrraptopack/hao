> This document is the implementation plan for the fullstack DX described in `FULLSTACK_DX_PROPOSAL.md`. `routed` is already implemented in the router; this plan focuses on the new server/runtime/manifest/adapters work.

# Auwla Fullstack Roadmap

## Decisions (locked)

| Topic | Decision |
|---|---|
| **Serialization** | `devalue` |
| **Manifest location** | `.auwla/server-manifest.json` + `.auwla/server-manifest.d.ts` |
| **Default method for plain functions** | GET |
| **Server file extension** | `.server.ts` |
| **SSR** | Out of scope for v1. `track.get/post` always use RPC on the client. Server-side direct-call path will be added later when SSR is revisited. |

---

## What already exists

- `routed` — exported from client page files, runs on navigation, provides `ctx.params`, `signal`, suspend mode, and `getRouted()`. See `src/router/Router.tsx` and `src/vite-router/README.md`.
- `track` — reactive async handle with pending/resolved/rejected/refresh/cancel. See `src/events/track.ts`.
- File-based routing plugin — scans pages, generates `auwla:routes` and `src/auwla.gen.ts`. See `src/vite-router/`.

We are **not** rebuilding any of that. We are adding the server side and the RPC bridge so that `track.get`/`track.post` work in components and inside `routed`.

---

## New code structure

```
src/
  server/
    index.ts              # public API: remote.get/post, defineMiddleware, getContext, getParams
    types.ts              # ServerContext, RemoteFunction, Middleware, ServerManifest types
    context.ts            # request-scoped context storage
    pipeline.ts           # middleware execution pipeline
    validate.ts           # validate(schema) middleware helper
  client/
    rpc.ts                # client-side RPC call implementation
  adapters/
    hono.ts               # Hono adapter
    express.ts            # Express adapter
    node.ts               # Node http adapter
  events/
    track.ts              # extended with track.get / track.post overloads
  router/
    Form.tsx              # <Form> component
  vite-router/
    server-scanner.ts     # scan *.server.ts files
    manifest.ts           # manifest generation logic
    plugin.ts             # extended to watch .server.ts and generate manifest

generated at build/dev:
  .auwla/server-manifest.json   # runtime manifest
  .auwla/server-manifest.d.ts   # generated types
```

Nothing in `src/server/` ships to the client. The Vite plugin enforces this.

---

## Phase 0: Types and manifest format

**Files:** `src/server/types.ts`, `src/vite-router/manifest.ts` (types only)

Define:

- `ServerManifest` — maps `routeName.exportName` to:
  - `modulePath`
  - `exportName`
  - `method: 'GET' | 'POST'`
  - `paramsType` (generated string for TS)
  - `argsType`
  - `returnType`
- `ServerContext<Params>`
- `Middleware` function type
- `RemoteFunction` type

**Exit criteria:** Types compile. Manifest format is stable enough for later phases.

---

## Phase 1: Build-time manifest generation

**Files:** `src/vite-router/server-scanner.ts`, `src/vite-router/manifest.ts`, `src/vite-router/plugin.ts`

Tasks:

1. Add a scanner that walks the pages directory and finds `*.server.ts` files.
2. Parse named exports from each `.server.ts` file (lightweight regex is fine for v1; AST later if needed).
3. Determine route key from file location:
   - `src/pages/posts/index.server.ts` → `posts`
   - `src/pages/posts/[id].server.ts` → `posts`
   - `src/pages/about.server.ts` → `about`
   - `src/server/auth.server.ts` → `auth`
4. Generate `routeName.exportName` keys.
5. Generate params types from the route file path (e.g., `[id]` → `{ id: string }`).
6. Write `.auwla/server-manifest.json` and `.auwla/server-manifest.d.ts` on build and dev startup.
7. Watch `.server.ts` files during dev; regenerate manifest and HMR-update importers.
8. Prevent `.server.ts` files from being loaded in the client bundle.

**Exit criteria:** Adding/removing a server function updates the manifest. Client builds do not include `.server.ts` source.

---

## Phase 2: Server runtime

**Files:** `src/server/context.ts`, `src/server/pipeline.ts`, `src/server/index.ts`, `src/server/validate.ts`

Tasks:

1. Request-scoped context using `AsyncLocalStorage` (Node) or equivalent.
2. `getContext()` and typed `getParams()` helpers.
3. `defineMiddleware()` helper.
4. Middleware pipeline executor.
5. `remote.get(handler)` and `remote.post([middleware], handler)` helpers.
   - These wrap a handler so the adapter can recognize it.
   - Plain async functions default to GET.
6. Validation helper `validate(schema)` built on `defineMiddleware`.

**Exit criteria:** Server functions can be declared and executed with middleware and context in a unit test.

---

## Phase 3: Client RPC track methods

**Files:** `src/client/rpc.ts`, `src/events/track.ts`

Tasks:

1. Add `track.get(key, ...args, options?)` and `track.post(key, ...args, options?)`.
2. These return a `TrackHandle`.
3. In the browser, they serialize args with `devalue` and POST to `/_auwla/rpc`.
4. Pass `signal` through for cancellation.
5. Handle RPC errors (network, validation, server error) and surface them on the handle.
6. Method filtering at the type level: `track.get` only accepts keys declared as GET.

**Exit criteria:** A client component can `track.get('posts.getPosts')` and render pending/resolved/rejected states.

---

## Phase 4: SSR direct-call path (deferred)

When SSR is revisited, add a server-side execution branch to `track.get` / `track.post`
so that `routed` and components can call server functions directly during server
rendering. For v1, `track.get` / `track.post` always use RPC, even inside `routed`.

---

## Phase 5: Adapters

**Files:** `src/adapters/fetch.ts`, `src/adapters/hono.ts`, `src/adapters/bun.ts`, `src/adapters/express.ts`

Tasks:

1. Build the WinterCG-compliant **fetch adapter** (`src/adapters/fetch.ts`).
   - Parse body: `{ key, args, routePath }` or multipart FormData.
   - Look up key in manifest.
   - Verify method matches.
   - Extract params from `routePath` using the manifest route pattern.
   - Build `ServerContext` and run middleware stack.
   - Call the handler and serialize the result with `devalue`.
   - Serialize errors with a stable shape.
2. Build thin framework wrappers:
   - `src/adapters/hono.ts` — one-liner around fetch adapter.
   - `src/adapters/bun.ts` — one-liner around fetch adapter.
   - `src/adapters/express.ts` — fetch adapter plus Request/Response shim (last).

**Exit criteria:** A user can mount the fetch adapter in Bun/Hono and call remote functions from the client.

---

## Phase 6: Forms

**Files:** `src/router/Form.tsx`

Tasks:

1. `<Form track={create} onSuccess={...}>` component.
2. With JS: intercept submit, call `track.run(formData)`, manage pending/error/success.
3. Without JS: submit to adapter endpoint with the remote key encoded in the action.
4. Adapter handles the form POST, runs validation, runs the function, then redirects or re-renders.

**Exit criteria:** A form creates a post with JS and falls back without JS.

---

## Phase 6: Examples and tests

**Files:** `examples/fullstack/`, `tests/server/`, `tests/vite-router/manifest.test.ts`, etc.

Tasks:

1. Minimal fullstack example:
   - `src/pages/posts/index.tsx`
   - `src/pages/posts/index.server.ts`
   - `src/pages/posts/[id].tsx`
   - `src/pages/posts/[id].server.ts`
   - `server.ts` with Hono adapter
2. Tests for:
   - manifest scanning
   - method type filtering
   - middleware execution order
   - RPC round-trip
   - `routed` with `track.get`
   - form progressive enhancement

**Exit criteria:** Example runs. Tests pass.

---

## Phase 7: Documentation

**Files:** `FULLSTACK_DX_PROPOSAL.md`, `FULLSTACK_ROADMAP.md`, `README.md`, `AGENTS.md`

Tasks:

1. Replace proposal with final docs.
2. Add fullstack quick-start to README.
3. Update AGENTS.md if conventions changed.

---

## Order of attack

Start with **Phase 0 + Phase 1 together**. Everything else depends on the manifest.

After Phase 1, **Phase 2 and Phase 3 can be developed in parallel**.

Phase 5 (adapters) depends on Phase 2 and Phase 3.

Phase 6 (forms) depends on Phase 5.

Phase 7 (examples/tests) validates everything.

Phase 8 (docs) is last.
