# Auwla Architecture

A map of the codebase: what each module owns, who may import whom, and where
the known problems live. Read this before touching anything.

Auwla is a JSX DOM runtime with **event-driven re-rendering**: component setup
runs once, state is plain closure variables, event handlers mutate them, and a
scheduled re-render is patched into the existing DOM. A build-time compiler
lowers render closures to direct DOM blocks with fine-grained dirty tracking.

## The core pipeline (client)

```
event fires
  → createEventListener (runtime/app.ts)        sets activeHandlerComponentId
  → user handler mutates closure state
    (compiler also emits __dirtySource marks per mutated variable)
  → invalidate(ownerId)                         dirty-path walk + queueMicrotask
  → renderNow()                                 re-runs dirty render closures
    → components: cached instance or re-render  (runtime/component.ts)
    → compiled blocks: update() guarded by      (compiler-runtime/block.ts)
      per-variable __dirty flags
  → patchRoot → patchChildren → patchNode       (runtime/patch.ts)
    → template-equal skip / setProps / LIS moves (runtime/reconcile.ts)
  → GC: unmounted instances run cleanups        (runtime/app.ts post-render)
```

## Layers and import rules

Arrows point downhill; a module may only import from layers below it.

```
5  vite/, vite-router/, dev-middleware   build-time plugins (Node, typescript)
4  server/, adapters/, client/           RPC pipeline, SSR glue (Node/server)
3  router/, track/, events/, head/       feature modules (browser)
2  compiler-runtime/                     helpers called by generated code
1  runtime/                              the DOM engine (browser, zero deps)
0  shared/                               pure utils/constants (no imports)
   compiler/                             build-time only (imports typescript,
                                         sits beside layer 5, never shipped
                                         to the browser)
```

Known violations (to fix, not to imitate):

- `runtime/ssr.ts` imports router/, track/, server/, client/, head/ — it
  should move up to layer 4 (only `adapters/shared.ts` consumes it).
- `router/navigation.ts` imports `reactive` from the package root `'auwla'`
  instead of `../runtime/reactive`.
- `track/core.ts` imports `../client/rpc` (layer 4) for route context.
- `runtime/app.ts` ↔ `compiler-runtime/template.ts` (hydration cursor) makes
  layers 1 and 2 mutually dependent; `runtime/islands.ts` self-imports
  `'auwla/runtime/app'` instead of a relative import.

## Module map

| Directory | Owns | Public entry | Notes |
|---|---|---|---|
| `runtime/` | component instances, render loop, DOM patching, `commit`/`createMemoApp`/`memo`, reactive cells | `auwla` | `app.ts` (434 ln) also holds event wrapping, rAF throttle, hydration bootstrap — split candidate |
| `compiler/` | TS-AST → codegen: two paths (template-clone, direct-DOM), derived-state analysis, auto-commit wrapping, `bind` lowering | `auwla/compiler` | pure build-time; no global state; `index.ts` (933 ln) is 5 passes in one file |
| `compiler-runtime/` | `__createBlock`, `__cloneTemplate`, `__setText` et al., keyed-map runtime, SSR stringifiers, hydration cursor | via `auwla` (`__*`) | called only by generated code |
| `events/` | chainable event modifiers (`event.prevent.debounce(250).handler(f)`), hotkey/intersect/touch/outside | `auwla/events` (+ sub-paths) | prototype-extension model: extension modules monkey-patch `EventChainProto` at import time for tree-shaking |
| `track/` | async state primitive (`TrackHandle`: pending/resolved/value), SWR cache, RPC client wrappers `track.get/post/form` | `auwla/track` | `core.ts` (746 ln) holds registry+handle+hydration+query — split candidate |
| `router/` | route matching, navigation (Navigation API + history fallback), `<Router>`, `<Link>`, loaders, suspense | `auwla/router` | `Router.tsx` (577 ln) mixes accessors, store-provider, 3 state machines — split candidate |
| `head/` | `<head>` hoisting (client) and SSR collection | `auwla/head` | ALS-backed provider on server, cleanup on unmount on client |
| `server/` | `remote.get/post`, middleware pipeline, validation, server context (ALS), manifest types | `auwla/server` | clean layering, zero Vite deps — the model module |
| `adapters/` | `createFetchAdapter` (reference impl: CSRF, dispatch, errors) + hono/bun wrappers | `auwla/adapters/*` | `express.ts` is a published placeholder that throws |
| `client/` | browser RPC client (`rpcCall`), current-route globals | `auwla/client` | module-level `_rpcRoutePath/_rpcRouteParams` (see SSR-race issue) |
| `vite/` | `auwla()` compiler plugin, `auwlaRouter()` plugin, config loader | `auwla/vite` | `router-plugin.ts` (560 ln) is a god-plugin (see roadmap) |
| `vite-router/` | pages scanner, `.server.ts` scanner (TS checker), routes codegen, server manifest | `auwla/vite-router` | pure/testable; plugin itself lives in `vite/` |
| `jsx/` | `jsx/jsxs/jsxDEV` entry points, intrinsic-element types | `auwla/jsx-runtime` | thin dispatch over `runtime/dom` |
| `config/` | `AuwlaConfig`, `defineConfig`, defaults | `auwla/config` | |
| `shared/` | pure helpers: LIS, deps equality, style serialization, Standard Schema, **all cross-layer constants** | (internal) | zero imports allowed here |

## Cross-module contracts (single source of truth)

Implicit contracts between codegen and runtime are the historical break
point. They live in `src/shared/constants.ts` and `src/compiler/constants.ts`:

- `ANCHOR_CHILD` / `ANCHOR_KEYED_MAP` — comment anchors emitted by the
  compiler, consumed by the hydration cursor and `__keyedMap`.
- `BOOLEAN_HTML_ATTRS` — present/absent attribute set shared by template
  codegen and the SSR stringifier.
- `GLOBAL_IDENTIFIERS` / `COMPILER_HELPER_IDENTIFIERS` — dependency-analysis
  exclusions (was 3 copies, had already drifted).
- Globals on `globalThis` (deliberate, survives double module loading):
  `__auwla_runtimeState`, `__auwla_asyncStorage`, `__auwla_rpcDispatcherProvider`,
  `__auwla_trackRegistryProvider`, `__auwla_routerStoreProvider`,
  `__auwla_headProvider`, `__auwla_islandModules`, `__auwla_vite_server`,
  `__AUWLA_DATA__`.

## Known-issue registry

Severity: **B** bug (wrong behavior), **S** security, **P** performance,
**M** modularity/maintainability. Status: ✅ fixed (with regression tests in
`tests/<area>/issue-fixes.test.*`), ⏳ open.

### Security

| # | Status | Where | Issue |
|---|---|---|---|
| S1 | ✅ | `adapters/fetch.ts:188-190` | Client-supplied `routeParams` trusted when pattern match fails → now 400 on mismatch; client params only accepted for pattern-less entries |
| S2 | ✅ | `adapters/fetch.ts:216-220` | Open redirect: 303 to client-controlled `routePath` → now restricted to same-origin relative paths |
| S3 | ✅ | `head/Head.tsx:65,92` | SSR head XSS → string children escaped, attrs escape `&`/`"`/`<` |
| S4 | ✅ | `adapters/fetch.ts:107-119` | Error duck-typing leaked internals → only `HttpError`-branded errors expose status/message/details |
| S5 | ✅ | `adapters/bun.ts:112` | Static file serving without path-containment check → `resolveStaticPath` (decode, NUL check, resolve+prefix containment) |
| S6 | ✅ | `vite-router/manifest.ts:24-33` | Absolute FS paths in `.auwla/server-manifest.*` → root-relative posix paths, resolved at load time (Vite root in dev, `__auwla_serverRoot`/cwd in prod) |

### Correctness

| # | Status | Where | Issue |
|---|---|---|---|
| B1 | ✅ | `vite/router-plugin.ts:268` vs `client/rpc.ts:68` | Generated client stubs called `rpcCall(key, args, {method})` → now pass `getCurrentRoutePath()` as the route path; direct calls work |
| B2 | ✅ | `runtime/ssr.ts:384` + `client/rpc.ts:29-30` | SSR race: route path/params module-level → ALS-backed `__auwla_routeContextProvider` per request; client unchanged |
| B3 | ✅ | `server/utils.ts:87-111` | GET remote with args crashed undici → no body for GET/HEAD; `parseBody()` falls back to first arg |
| B4 | ✅ | `runtime/patch.ts:57` | Mixed-case SVG tags (`clipPath` etc.) always `replaceChild`'d → now patch in place |
| B5 | ✅ | `runtime/app.ts:337-345` | Async handler's deferred `finally` clobbered `activeHandlerComponentId` → removed |
| B6 | ✅ | `runtime/computed.ts:55` | Computed getters stale on full `commit()` → all getters dirtied when no owner |
| B7 | ✅ | `runtime/app.ts:408-422` | `destroy()` leaked global computed/effects/source-deps → mirrors render-loop GC |
| B8 | ✅ | `track/core.ts:449-450` | Aborted run nulled the *new* run's controller → identity check + run token |
| B9 | ✅ | `track/core.ts:535-605` | Promise-overload `track()` ignored cancellation → per-key run tokens gate transitions |
| B10 | ✅ | `router/Link.tsx:142` | `<Link prefetch>` keyed by resolved URL → `prefetchRoute` matches patterns against resolved paths |
| B11 | ✅ | `router/Router.tsx:342-346` | 404 broke navigation bookkeeping → `cachedPath` updated, loader/context cleared |
| B12 | ✅ | `router/Router.tsx:351-369` | Guards re-ran every render → verdict cached per path |
| B13 | ✅ | `track/core.ts:611-622` | Loader stale-serve-once → fast-path only for SSR-seeded entries; real runs re-run |
| B14 | ✅ | `compiler/template.ts:357` | SSR codegen didn't escape `` ` ``/`\`/`${` in static content → `escapeSsrStatic` |
| B15 | ✅ | `compiler/attributes.ts:284-305` | `bind={derived}` emitted invalid `name() = …` → bails to runtime fallback |
| B16 | ✅ | `compiler/index.ts:569-575` + `applyReplacements` | Overlapping replacements corrupted output (nested awaits duplicated text) → contained replacements dropped |
| B17 | ✅ | `router/routes.ts:71-78` | Param names limited to letters, unescaped static segments → identifier rules + escaping + memoized regexes |
| B18 | ✅ | `events/intersect.ts:10,63-68` | IntersectionObserver leaks → teardown now hooks the AbortSignal the runtime binds with |
| B19 | ✅ | `runtime/dom.ts:301-311` | `__outside` window listeners leaked on wholesale removal → lazy self-detach on next event once disconnected |
| B20 | ✅ | `runtime/islands.ts:127-135,156` | Observer never disconnected; `destroy()` no-op → shared observer, auto-disconnect on idle/destroy |

### Performance

| # | Status | Where | Issue |
|---|---|---|---|
| P1 | ✅ | `vite-router/server-scanner.ts:85` | `ts.createProgram` per scan → cached program keyed by files+mtimes (fixes the 5s+ test timeouts) |
| P2 | ✅ | `compiler/derived.ts:509` etc. | Fresh TS parser per patch line → `compiler/parse-cache.ts` (512-entry FIFO) |
| P3 | ✅ | `runtime/app.ts` | O(depth×n) orphan GC → single-pass chain-walk with memoized verdicts; O(sources×components) propagation → inverted source→components index |
| P4 | ✅ | `track/core.ts:602`, `track/remote.ts:169,227` | `JSON.stringify` SWR diffing → `shared/deep-equal.ts` (key-order-insensitive, no throws) |
| P5 | ✅ | `router/routes.ts:89-97` | Route regexes recompiled per match → memoized per path (fixed with B17) |

### Modularity / structural

| # | Status | Where | Issue |
|---|---|---|---|
| M1 | ⏳ | `runtime/app.ts` | Split events (`createEventListener`, throttle) and hydration/island bootstrap out |
| M2 | ✅ | `runtime/ssr.ts` | DOM mocks extracted to `ssr-mocks.ts` (479→278 lines); `renderToString` move to layer 4 still open |
| M3 | ✅ | `track/core.ts` | Split into `registry.ts` / `handle.ts` / `hydration.ts` / `query.ts`; `core.ts` is a 26-line barrel; remote-only types moved to `remote.ts` |
| M4 | ⏳ | `router/Router.tsx` | Extract accessors+store-provider (`context.ts`) and loader/suspense machine |
| M5 | ⏳ | `compiler/index.ts` | Split: orchestrator / function-scope transforms / auto-commit / walker |
| M6 | ⏳ | `vite/router-plugin.ts` | Extract SSG (lines 93-208), unify Node↔Fetch shims with `dev-middleware.ts` (`adapters/node-http.ts` created as their home), share template splicing with `adapters/shared.ts`, dedupe the second export parser |
| M7 | ⏳ | `compiler/jsx-node.ts` | Merge the two ~90-line keyed-map compilers |
| M8 | ✅ | `compiler/` | Six assignment-operator token copies → `ASSIGNMENT_TOKENS`/`INC_DEC_TOKENS` in `compiler/constants.ts` |
| M9 | ✅ | `events/` | `EventChain` is now an interface with the true core surface; extension modules augment it via `declare module` — types match runtime imports |
| M10 | ⏳ | `runtime/` | Two `memo` APIs with different scoping/eviction; unify |
| M11 | ✅ | `adapters/express.ts` | Implemented for real (`createFetchAdapter` + `adapters/node-http.ts` shims) with tests |
| M12 | ⏳ | `vite/` ↔ `vite-router/` | Inverted dependency (`vite-router/index.ts` re-exports the plugin from `vite/`) — pick one owner |

### Failing tests — all fixed (suite is green)

Previously failing, now passing with regression coverage:

1. `tests/adapters/{bun,fetch,hono}.test.ts` — adapters no longer statically
   import virtual modules; the generated manifest self-registers on
   `globalThis.__auwla_serverManifest` and adapters fall back to a
   variable-specifier dynamic import. (Two stale tests also hardcoded POST
   against GET endpoints — corrected.)
2. `tests/vite-router/server-scanner.test.ts` + `manifest.test.ts` — ts.Program
   cache (P1) + 30s describe timeouts.
3. `tests/compiler/basics.test.ts` › island hydration — was a race between the
   dynamic-import hydration chain and a fixed 5-macrotask wait; now waits
   deterministically for the live (listener-bound) island button. Note the
   framework-side smell it exposed: during app hydration the app briefly
   renders the island's SSR content itself before the island mount replaces it
   (double render) — real island SSR uses empty shells, so only tests with
   pre-rendered island content hit this.

New regression suites added this round: `tests/runtime/issue-fixes.test.tsx`,
`tests/track/issue-fixes.test.ts`, `tests/router/issue-fixes.test.ts`,
`tests/head/issue-fixes.test.ts`, `tests/compiler/issue-fixes.test.ts`.

## Modularity roadmap

Phase 0 — done: module map + issue registry (this file), constants
consolidation (`shared/constants.ts`, `compiler/constants.ts`), removed broken
`auwla/css` export, fixed stale `auwla/vite` dev alias.

Phase 1 — mechanical splits (no behavior change, test after each):
1. `runtime/ssr.ts` → extract `runtime/ssr-mocks.ts`.
2. `track/core.ts` → `registry.ts` / `hydration.ts` / `query.ts` (+ types to `remote.ts`).
3. `compiler/index.ts` → extract auto-commit wrapping + function-scope builders.
4. Merge keyed-map compilers; dedupe assignment-op tables (M7/M8).

Phase 2 — boundary fixes:
1. Move `renderToString` + mocks to layer 4 (`server/` or `adapters/`), runtime becomes a true bottom layer.
2. Fix adapter virtual-module import (failing adapter tests) via option injection.
3. Extract router accessors/store into `router/context.ts` (M4).
4. Extract SSG + HTTP shims from `router-plugin.ts` (M6).

Phase 3 — correctness sweeps (DONE): every S/B/P registry row is fixed with
regression tests. Remaining registry work is the modularity roadmap
(M1–M12, Phases 1–2 above).

Rules for new code: respect the layer table; cross-layer strings/globals go
in `shared/constants.ts`; new feature = new module + a row in the map above;
no new `globalThis` state without a comment justifying double-loading safety.
