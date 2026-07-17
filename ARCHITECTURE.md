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
**M** modularity/maintainability. Test status: see "Failing tests" below.

### Security

| # | Sev | Where | Issue |
|---|---|---|---|
| S1 | S | `adapters/fetch.ts:188-190` | Client-supplied `routeParams` trusted when pattern match fails — should 400 |
| S2 | S | `adapters/fetch.ts:216-220` | Open redirect: 303 to client-controlled `routePath` after form POST |
| S3 | S | `head/Head.tsx:65,92` | SSR head XSS: string children unescaped, attrs only quote-escaped |
| S4 | S | `adapters/fetch.ts:107-119` | Error duck-typing leaks `message`/`details` for any error with numeric `.status` |
| S5 | S | `adapters/bun.ts:112` | Static file serving without path-containment check |
| S6 | S | `vite-router/manifest.ts:24-33` | Absolute FS paths in `.auwla/server-manifest.*` |

### Correctness

| # | Sev | Where | Issue |
|---|---|---|---|
| B1 | B | `vite/router-plugin.ts:268` vs `client/rpc.ts:68` | Generated client stubs call `rpcCall(key, args, {method})` — options land in `routePath`; direct calls of server functions are broken (only `track.get/post` path works) |
| B2 | B | `runtime/ssr.ts:384` + `client/rpc.ts:29-30` | SSR race: route path/params are module-level, not ALS-backed — concurrent requests can read each other's params |
| B3 | B | `server/utils.ts:87-111` | GET remote with args builds `new Request(..., {body})` → undici throws |
| B4 | B | `runtime/patch.ts:57` vs `runtime/dom.ts:143` | Mixed-case SVG tags (`clipPath` etc.) never patch, always `replaceChild` |
| B5 | B | `runtime/app.ts:337-345` | Async handler's deferred `finally` clobbers `activeHandlerComponentId` of a later handler |
| B6 | B | `runtime/computed.ts:55` | Computed getters not dirtied on full `commit()` — stale values |
| B7 | B | `runtime/app.ts:408-422` | `destroy()` leaks global computed/effects/source-deps entries |
| B8 | B | `track/core.ts:449-450` | Aborted run's settle nulls the *new* run's controller — cancellation lost |
| B9 | B | `track/core.ts:535-605` | Promise-overload `track()` ignores cancellation; stale settle overwrites fresh state |
| B10 | B | `router/Link.tsx:142` vs `vite-router/codegen.ts:290` | `<Link prefetch>` keyed by resolved URL, map keyed by route pattern — prefetch no-ops on dynamic routes |
| B11 | B | `router/Router.tsx:342-346` | 404 branch returns before `cachedPath` update — breaks subsequent navigation bookkeeping |
| B12 | B | `router/Router.tsx:351-369` | Guards re-run on every Router re-render, not just path change |
| B13 | B | `track/core.ts:611-622` | Loader stale-serve-once: 2nd visit serves cached data, 3rd re-runs |
| B14 | B | `compiler/template.ts:357` | SSR codegen embeds HTML in backticks escaping only `&<>"` — backtick/`${` in static text breaks generated code |
| B15 | B | `compiler/attributes.ts:284-305` | `bind={derived}` emits `name() = …` invalid JS, no diagnostic |
| B16 | B | `compiler/index.ts:569-575` | Nested `await` wrap ranges overlap; inner wrap silently lost |
| B17 | B | `router/routes.ts:71-78` | Param names limited to `[a-zA-Z]+`; static segments not regex-escaped |
| B18 | B | `events/intersect.ts:10,63-68` | IntersectionObserver leaks: teardown only via patched `removeEventListener`, but runtime unbinds via AbortSignal |
| B19 | B | `runtime/dom.ts:301-311` | `__outside` window listeners leak when node removed wholesale |
| B20 | B | `runtime/islands.ts:127-135,156` | IntersectionObserver never disconnected; `createIslandsApp.destroy()` no-op |

### Performance

| # | Sev | Where | Issue |
|---|---|---|---|
| P1 | P | `vite-router/server-scanner.ts:85` | `ts.createProgram` over all server files on every HMR — causes the 5s+ test timeouts |
| P2 | P | `compiler/derived.ts:509` etc. | Fresh TS parser per patch/setup line (`expand`, `extractIdentifiers`, …), no caching |
| P3 | P | `runtime/app.ts:223-236,271-281` | O(depth×n) orphan GC; O(sources×components) dirty-source propagation |
| P4 | P | `track/core.ts:560`, `track/remote.ts:169,227` | `JSON.stringify` diffing for SWR — O(payload), key-order sensitive, throws on circular/BigInt |
| P5 | P | `router/routes.ts:89-97` | Route regexes recompiled per match call |

### Modularity / structural

| # | Sev | Where | Issue |
|---|---|---|---|
| M1 | M | `runtime/app.ts` | Split events (`createEventListener`, throttle) and hydration/island bootstrap out |
| M2 | M | `runtime/ssr.ts` | Split DOM mocks (`ssr-mocks.ts`); move `renderToString` to layer 4 |
| M3 | M | `track/core.ts` | Split into registry / handle+lifecycle / hydration / query; move remote-only types to `remote.ts`; invert `core → client/rpc` dep |
| M4 | M | `router/Router.tsx` | Extract accessors+store-provider (`context.ts`) and loader/suspense machine |
| M5 | M | `compiler/index.ts` | Split: orchestrator / function-scope transforms / auto-commit / walker |
| M6 | M | `vite/router-plugin.ts` | Extract SSG (lines 93-208), unify Node↔Fetch shims with `dev-middleware.ts`, share template splicing with `adapters/shared.ts`, dedupe the second export parser |
| M7 | M | `compiler/jsx-node.ts` | Merge the two ~90-line keyed-map compilers |
| M8 | M | `compiler/` | Assignment-operator token sets ×6 → one table (constants.ts started) |
| M9 | M | `events/` | `EventChain` type always declares extension modifiers (`hotkey`, `touch`, …) though they only exist after side-effect imports → per-module `declare module` augmentation |
| M10 | M | `runtime/` | Two `memo` APIs with different scoping/eviction; unify |
| M11 | M | `adapters/express.ts` | Published but throws — implement or remove from exports |
| M12 | M | `vite/` ↔ `vite-router/` | Inverted dependency (`vite-router/index.ts` re-exports the plugin from `vite/`) — pick one owner |

### Failing tests (pre-existing baseline: 553 pass / 6 fail)

1. `tests/adapters/{bun,fetch,hono}.test.ts` — suites fail to load:
   `src/adapters/bun.ts:137` dynamically imports the virtual module
   `auwla:server-manifest`, which vite import-analysis cannot resolve outside
   the router plugin. Adapters should not statically reference virtual modules
   (inject via options, or guard with `import.meta`-level indirection).
2. `tests/vite-router/server-scanner.test.ts` (5) + `manifest.test.ts` (2) —
   5s timeouts, symptom of P1.
3. `tests/compiler/basics.test.ts` › island hydration — "Count: 2" vs
   expected "Count: 3": island click invalidation off by one (uninvestigated).

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

Phase 3 — correctness sweeps (each is independently shippable):
security S1–S6, then B1–B20 in severity order, adding a regression test per fix.

Rules for new code: respect the layer table; cross-layer strings/globals go
in `shared/constants.ts`; new feature = new module + a row in the map above;
no new `globalThis` state without a comment justifying double-loading safety.
