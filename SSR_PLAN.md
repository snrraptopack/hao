# SSR Implementation Plan (following `ssr.md` strictly)

## Goal

Implement real server-side rendering for Auwla: render the matched route to an HTML string on the server, with data resolved synchronously before render, and the client able to hydrate without refetching.

The plan follows `ssr.md` Phase 1 first: synchronous data resolution + string rendering. Streaming (Phase 2) is explicitly out of scope for this plan.

---

## Architecture summary from `ssr.md`

- **Compiler fast path** currently lowers JSX to DOM mutations (`__cloneTemplate`, `__setText`, etc.). In SSR it must lower to template-literal string concatenation.
- **Runtime bailout path** currently falls back to `h()` creating `TemplateNode`s that are inflated into DOM. In SSR `h()` must produce a lightweight `SsrNode` that stringifies.
- **Data resolution** happens before render: the router awaits `routed`, populates the `track` registry, then renders synchronously to a string.
- **Hydration** later adds `__hydrateTemplate` so the client walks existing server-rendered DOM instead of cloning templates.

---

## Current state

Already implemented:

- `src/server/*` — `getContext`, `getParams`, `defineMiddleware`, `runMiddleware`, `remote.get/post`, `validate`, errors, types.
- `src/vite-router/server-scanner.ts` + `manifest.ts` — `.server.ts` scanning and manifest generation.
- `src/adapters/*` — RPC adapters.
- `src/events/track.ts` — `track.get` / `track.post` wired to `rpcCall` (browser fetch only).
- `src/compiler/*` — DOM-mutation compiler.
- `src/runtime/*` — DOM runtime with `__componentBlock`, `__createBlock`, `__cloneTemplate`, `h()`.

Missing for SSR:

1. Server-side direct execution for `track.get` / `track.post`.
2. SSR compiler target (template-literal output).
3. SSR runtime bailout (`SsrNode`).
4. Server render entry that matches URL, runs `routed`, and stringifies.
5. Hydration path (client `__hydrateTemplate`).

---

## Phase 1: Server-side direct execution of remote functions

**Files:**
- `src/runtime/rpc-dispatcher.ts` (new)
- `src/events/track.ts`
- `src/client/rpc.ts`
- `src/server/ssr-invoke.ts` (new)

**Work:**
1. Create `src/runtime/rpc-dispatcher.ts` exporting `setRpcDispatcher(fn)` and `getRpcDispatcher()`.
2. Client entry (`src/client/index.ts` or app bootstrap) calls `setRpcDispatcher(rpcCall)`.
3. Create `src/server/ssr-invoke.ts` with a function that:
   - reads the server manifest,
   - finds the matching manifest entry for a `key`,
   - loads the `.server.ts` module,
   - builds `ServerContext` from the current request + route path,
   - runs the middleware stack,
   - calls the handler.
4. Update `track.get` and `CommandHandle.run` to call `getRpcDispatcher()` instead of importing `rpcCall` directly.
5. Browser behavior unchanged; server behavior now executes functions directly.

**Exit criteria:** A unit test can call `track.get('posts.getPosts')` on the server and receive the real function result without a network request.

---

## Phase 2: SSR compiler target (template literals)

**Files:**
- `src/vite.ts`
- `src/compiler/index.ts`
- `src/compiler/template.ts`
- `src/compiler/jsx-node.ts`
- `src/compiler/attributes.ts`
- `src/compiler/types.ts`
- `src/compiler-runtime/index.ts`

**Work:**
1. Thread `ssr?: boolean` from `src/vite.ts` `transform(code, id, options)` into `compileAuwla(sourceText, fileName, options)`.
2. In `src/compiler/index.ts`, pass `ssr` through `compileRenderClosure`.
3. In `src/compiler/template.ts`, when `ssr` is true:
   - skip `__cloneTemplate`, element vars, and DOM patch generation,
   - return an `__ssrBlock(() => \`...\`)` expression that interpolates static HTML with escaped dynamic values.
4. In `src/compiler/jsx-node.ts`, when `ssr` is true:
   - for bailout paths, emit `__ssrNode(h(...))` so the runtime `h()` returns an `SsrNode` that stringifies.
5. In `src/compiler/attributes.ts`, when `ssr` is true:
   - inline static attributes as HTML strings,
   - drop event listeners (server cannot run them),
   - correctly handle dynamic boolean/value/checked attributes.
6. Add `__ssrBlock`, `__ssrNode`, `__ssrKeyedMap`, `__escapeHtml` to `COMPILER_IMPORT` and export them from `src/compiler-runtime/index.ts`.

**Exit criteria:** A simple component compiled with `ssr: true` renders to an HTML string matching the browser DOM output.

---

## Phase 3: SSR runtime bailout (`SsrNode`)

**Files:**
- `src/runtime/types.ts`
- `src/runtime/dom.ts`
- `src/runtime/template.ts`

**Work:**
1. Add `SsrNode` type to `src/runtime/types.ts`:
   ```ts
   export type SsrNode = {
     __auwlaSsr: true;
     tag: string;
     props: Record<string, unknown>;
     children: unknown[];
     toString(): string;
   };
   ```
2. In `src/runtime/dom.ts`, patch `h()` so that when `typeof document === 'undefined'` it returns an `SsrNode` instead of a real DOM element / `TemplateNode`.
3. In `src/runtime/template.ts`, guard `createTemplateElement()` for server environment or branch in `h()` before calling it.
4. Add `__ssrNode(node)` helper in compiler-runtime that stringifies an `SsrNode` and escapes children.
5. Add `__escapeHtml(value)` helper.

**Exit criteria:** A component that triggers compiler bailout (e.g., dynamic tag `<props.tag>`) renders to a correct HTML string on the server.

---

## Phase 4: Server render entry

**Files:**
- `src/router/navigation.ts`
- `src/router/Router.tsx`
- `src/runtime/ssr.ts` (new)

**Work:**
1. Export `setCurrentPath(path: string)` from `src/router/navigation.ts`.
2. Create `src/runtime/ssr.ts` with `renderToString(url, routes, manifest, request)`:
   - Set up a fresh request-scoped render state.
   - Call `setRpcDispatcher(serverDispatcher)` for this request.
   - Call `setCurrentPath(url)`.
   - Use `matchRoutes(routes, url)` to find the matched route.
   - If the route has `routed`, run it and await resolution.
   - Set router internal state (`_currentContext`, `_currentLoader`).
   - Evaluate the route component's render closure and stringify to HTML.
   - Serialize the resolved `track` registry into a `<script>` tag for hydration.
   - Return `{ html, data }`.
3. Optionally reuse `Router` component by pre-seeding its state, but prefer a dedicated helper to avoid browser-only lifecycle side effects.

**Exit criteria:** A request to `/posts` returns a full HTML string with the posts list already rendered and the track data embedded for hydration.

---

## Phase 5: Hydration

**Files:**
- `src/runtime/template.ts`
- `src/runtime/dom.ts`
- `src/runtime/app.ts`
- `src/compiler-runtime/index.ts`

**Work:**
1. Add `__hydrateTemplate(html: string, markerMap: Record<string, number>)` to compiler-runtime.
   - Walk the existing DOM children matching the compiled template structure.
   - Capture element refs (`el0`, `text0`, etc.) and event listener targets.
2. Update `src/runtime/app.ts` `createMemoApp()` to detect a server-rendered root and call `__hydrateBlock` instead of mounting from scratch.
3. Deserialize the embedded track registry before hydration so `track.get` resumes as `.resolved`.
4. Emit comment markers (`<!--auwla:child-->`) from SSR bailout paths so `__setChild` can anchor correctly.

**Exit criteria:** The browser hydrates server-rendered HTML without wiping DOM or refetching resolved tracks.

---

## Order of implementation

1. Phase 1 (server direct execution) — unblock `routed` during SSR.
2. Phase 2 + Phase 3 in parallel (SSR compiler + runtime bailout) — unblock string rendering.
3. Phase 4 (server render entry) — wire URL → HTML.
4. Phase 5 (hydration) — make it resume on the client.

---

## Risks / open questions

- `__keyedMap` is DOM-based; SSR needs a string equivalent.
- `tryInlineComponent()` in the compiler inlines DOM-generating code and needs an SSR branch.
- Event listeners cannot run on the server; hydration must re-attach them.
- `runtimeState` must be request-scoped on the server.
- `track.get` uses `getCurrentRoutePath()`; on the server this must read the request URL.

This plan follows `ssr.md` strictly: template-literal compiler, `SsrNode` bailout, synchronous data resolution before render, and hydration as the final step.
