# Vite 8 / Rolldown Plugin API — Reference

Vite 8 (stable, March 2026) ships **Rolldown** — a Rust-based bundler by the VoidZero
team (same team as Vite, built on **Oxc**) — as its single unified bundler, replacing
the old esbuild (dev) + Rollup (prod) split. Rolldown's plugin API is intentionally
**Rollup-compatible** at the JS surface, so most existing Rollup/Vite plugins work
unmodified. Vite then layers a small set of Vite-only hooks on top for dev-server /
HMR / HTML concerns that Rolldown itself has no notion of.

This doc covers: the plugin shape, universal (Rolldown-level) hooks, Vite-only hooks,
the `PluginContext` utility API, Hook Filters (the main new performance mechanism),
virtual modules, and the TS/JSX transform gotcha specific to Rolldown.

---

## 1. Plugin shape

```ts
export default function myPlugin() {
  return {
    name: 'my-plugin', // required — shows up in warnings/errors/devtools
    // ...hooks
  }
}
```

- `name` is required.
- Naming convention: if the plugin only uses Rolldown-compatible hooks (no
  Vite-specific ones), prefix it `rolldown-plugin-*` and add both `rolldown-plugin`
  and `vite-plugin` keywords to `package.json` — this signals it also works in plain
  Rollup/Rolldown projects, not just Vite. If it uses Vite-only hooks, prefix it
  `vite-plugin-*`, add the `vite-plugin` keyword, and document *why* it's Vite-only.
- If your plugin creates virtual modules, prefix the module id with `\0` so other
  plugins don't try to resolve/load/transform it as a real file.

## 2. Hook execution semantics

Every hook is one of:

| Kind | Behavior |
|---|---|
| `async` | May return a Promise resolving to the same value type; otherwise treated as sync. |
| `first` | Plugins run in order until one returns non-`null`/non-`undefined`. Used by `resolveId`, `load`. |
| `sequential` | All plugins run in order; if a hook is async, later ones wait for it to resolve. |
| `parallel` | All plugins run in order, but async hooks run concurrently rather than waiting. |

Plugin order across the whole build is also affected by `enforce: 'pre' | 'post'` and
array position.

## 3. Universal (Rolldown) build hooks

These run during the **build phase**: locating, providing, and transforming input
files before Rolldown's internal transform step. First hook: `options`. Last hook:
`buildEnd` (or `closeBundle` if a build error occurred after that).

### `options`
Called once per `rolldown()` build. Modify build options before anything else runs.

### `buildStart`
Called once the build options are finalized. Good place to validate config or kick
off async setup.

### `resolveId`
```ts
resolveId(source, importer, options): ResolveIdResult
```
- `source` — the importee exactly as written (`'./foo.js'`). Rolldown always passes
  a string (unlike Rollup, which may pass an AST node in some contexts).
- `importer` — fully resolved id of the importing module. `undefined` for
  `this.resolve(source, undefined, { kind: 'dynamic-import' })` calls.
- Return `null`/`undefined` → defer to other `resolveId` hooks / default resolution.
- Return `false` → treat as external, not bundled. For relative imports, the id is
  renormalized the same way `external` option would.
- Return an object (`PartialResolvedId`) → resolve to a different id while
  optionally still marking external.
- **Important:** `external`, `meta`, `moduleSideEffects` can only be set *once*,
  before the module loads — later `load`/`transform` hooks can override them and
  take precedence.
- `first` kind hook.
- There's also a Rollup-compat-only `resolveDynamicImport` — **use `resolveId`
  instead** in new code.

### `load`
```ts
load(id): LoadResult
```
- Defines a custom loader. Return `null` to defer to other `load` hooks or the
  filesystem.
- Use `this.getModuleInfo()` inside to inspect previous `meta`/`moduleSideEffects`.
- `first` kind hook.

### `transform`
```ts
transform(code, id): TransformResult
```
- Transform an individual module's source.
- You may return only metadata properties with no code change.
- If you return a `moduleType` (changing the module's type), the module is **not**
  re-run through the plugin chain from the start — plugins that already saw it won't
  be re-invoked with the new type. Put type-changing plugins early in the plugin
  list, or create a virtual module with a different `moduleType` instead if you need
  every plugin to see it.
- **TS/JSX gotcha (Rolldown-specific):** Rolldown runs its *internal* TS/JSX → JS
  transform **after** your `transform` hooks run, for performance. This means a
  `transform` hook receiving `.ts`/`.tsx` source must itself be able to handle
  TS/JSX syntax. Two ways to do that:
  1. `this.parse(code, { lang: 'ts' | 'tsx' | ... })` — parses TS/JSX directly via
     Rolldown's built-in Oxc-based parser.
  2. Import `transform` from `rolldown/utils` to convert TS/JSX to plain JS
     yourself first — has extra overhead vs. option 1.
- `sequential` kind hook (chainable — each plugin sees the previous plugin's output).

### `moduleParsed`
Called once a module is fully parsed. Waits until all of that module's imports are
resolved, so `moduleInfo.importedIds` / `dynamicallyImportedIds` are complete and
accurate (importers of it may still be incomplete, since more could be discovered
later). **Not called in Vite dev mode** — Vite skips full AST parses in dev for
speed.

### `buildEnd`
Called when Rolldown finishes bundling, before Output Generation Hooks. If a build
error occurred, it's passed here.

### `watchChange` (watch mode only)
Fires whenever Rolldown detects a change to a monitored file, once per changed file,
after any in-progress build finishes. Cannot be used by output-only plugins. For
instant-as-it-happens notification instead, use `watch.onInvalidate`.

### `closeWatcher` (watch mode only)
Fires when the watcher process is about to close, so plugins can clean up open
resources. Cannot be used by output-only plugins.

## 4. Output generation hooks

Run after bundling completes. Plugins using *only* these can be passed via
`output` options and thus scoped to run only for specific outputs.

- `renderStart` — read fully-resolved output options (post all `outputOptions`
  transforms) — prefer this over reading raw config if you need output options.
- `renderChunk` — transform a generated chunk's code before it's written.
- `augmentChunkHash` — contribute to a chunk's content hash.
- `generateBundle`
- `writeBundle`
- `closeBundle` — always called last, including after a build error.

Note: **placeholder filenames.** If a chunk's filename will contain a content hash,
calling `this.getFileName()` before `generateBundle` returns a placeholder, not the
real name. If you embed that filename in a chunk you transform in `renderChunk`,
Rolldown swaps in the real hash before `generateBundle`, so the hash still reflects
final content.

## 5. Vite-only hooks (no Rolldown equivalent)

These exist because Vite has a dev server / HMR / HTML pipeline that a plain bundler
doesn't.

| Hook | Signature | Purpose |
|---|---|---|
| `config` | `(config: UserConfig, env: ConfigEnv) => UserConfig \| null \| void \| Promise<...>` | Modify config before it's resolved. |
| `configResolved` | `(config: ResolvedConfig) => void` | Read the final resolved config (e.g. `config.oxc`, `config.optimizeDeps.rolldownOptions`). |
| `configureServer` | `(server: ViteDevServer) => (() => void) \| void \| Promise<void>` | Add custom middleware to the dev server's connect instance. If it returns a function, that runs *after* internal middlewares ("post-middlewares"). |
| `configurePreview` | similar, for `vite preview` | |
| `transformIndexHtml` | `(html, ctx) => IndexHtmlTransformResult \| void \| Promise<...>` | Transform `index.html`. Can return a string, tag descriptors, or `{ html, tags }`. Supports `order: 'pre' \| 'post'` to run before/after unordered hooks. |
| `hotUpdate` | `(ctx: HotUpdateContext) => Array<EnvironmentModuleNode> \| void` | **Replaces the old `handleHotUpdate`.** Filter/narrow which modules get HMR'd, do custom HMR signaling, or handle changes to files with no direct module mapping. |
| `watchChange` | shared with Rolldown | also usable here |

**Vite 8 also introduced a per-environment plugin system** — hooks get access to the
specific `Environment` instance they're running in (client vs. SSR), so you can
write distinct logic per environment. Use `applyToEnvironment` to scope a plugin to
specific environments.

### Dev vs. build hook availability
- During dev, Vite's dev server runs a **plugin container** that invokes the
  Rolldown build hooks the same way Rolldown itself would.
- The following run once on server start: `options`, `buildStart`, and other
  once-per-build hooks.
- The following run on server close: `buildEnd`, `closeBundle`, `closeWatcher`.
- `moduleParsed` is **not** called in dev (no full AST parse, for speed).
- Output Generation Hooks (except `closeBundle`) are **not** called in dev.
- Some `resolveId` calls during dev may report `importer` as the absolute path to
  a generic root `index.html` rather than the real importer, since Vite's
  unbundled dev-server pattern can't always derive the true importer. Imports
  handled inside Vite's own resolve pipeline get correct importer tracking during
  import-analysis.

## 6. `PluginContext` — utility API available inside most hooks (via `this`)

- `this.resolve(source, importer?, options?)` → `Promise<ResolvedId | null>` — resolve
  an import id using the same plugin chain Rolldown itself uses (including whether
  it should be external).
- `this.load({ id, resolveDependencies?, ...moduleOptions })` → loads/parses a module,
  triggering the same `load`/`transform`/`moduleParsed` hooks as if it were imported
  normally. Useful for inspecting a module's final content in `resolveId` before
  deciding how to resolve it (e.g. resolving to a proxy module instead).
  **Caution:** safe to call in `resolveId`; risky to `await` inside `load`/`transform`
  — cyclic dependencies can deadlock. Manually avoid awaiting `this.load` for modules
  that could be in a cycle with the module currently loading.
- `this.parse(code, { lang })` — Rolldown's built-in parser (ESTree-compatible AST),
  with `lang` support for TS/JSX. This is the recommended way to handle TS/JSX inside
  a `transform` hook (see §3 gotcha above).
- `this.getModuleInfo(id)` — read `meta`, `moduleSideEffects`, importedIds, etc.
- `this.addWatchFile(path)` — monitor a file/directory not otherwise part of the
  graph (absolute or CWD-relative path). Call from the hook that actually depends
  on it.
- `this.emitFile(descriptor)` — emit a chunk, prebuilt chunk, or asset into the
  build output.
  - `type: 'chunk'` — new chunk with the given module id as entry point; existing
    chunks get split or a facade re-export chunk is created rather than duplicating
    modules. A chunk with an explicit `fileName` always gets its own chunk;
    unnamed emitted chunks may get deduplicated with existing ones.
  - `type: 'prebuilt-chunk'` — emits fixed, pre-built content via `code`. Not part
    of the module graph — if referenced in imports, mark it external in
    `resolveId`.
  - Reference an emitted file's URL from `load`/`transform` output via
    `import.meta.ROLLUP_FILE_URL_<referenceId>`.
- `this.getFileName(referenceId)` — get an emitted file's name (may be a hash
  placeholder before `generateBundle`, see §4).

## 7. Hook Filters — the main new performance mechanism

**Why they exist:** every JS plugin hook call crosses the Rust↔JS boundary. Hook
Filters let Rolldown evaluate a filter condition **on the Rust side** and skip
calling your JS handler entirely when it doesn't match — avoiding the cross-boundary
call, not just short-circuiting inside JS. Only available on `resolveId`, `load`,
`transform`.

```ts
import { and, id, include, moduleType } from '@rolldown/pluginutils'

export default function myPlugin() {
  return {
    name: 'my-plugin',
    transform: {
      filter: [include(and(id(/\.ts$/), moduleType('ts')))],
      handler(code, id) {
        // only called for .ts files with moduleType 'ts'
        return transformedCode
      },
    },
  }
}
```

Filter builders from `@rolldown/pluginutils`:
- `id(pattern, params?)` — string = exact match; RegExp = tested against id.
- `importerId(pattern, params?)` — same, but on the importer id. **Only usable
  with `resolveId`.**
- `moduleType(type)` — e.g. `'js'`, `'tsx'`, `'json'`.
- `code(pattern)` — filter by code content.
- `query(key, pattern)` / `queries(obj)` — filter by query-string parameters.
- `and(...)` / `or(...)` / `not(...)` — logical composition.
- `include(expr)` / `exclude(expr)` — top-level wrappers.

**Backward-compat pattern** (support both filtered and unfiltered Rollup/Vite
versions at once):

```ts
const idFilter = /\.data$/
export default function myPlugin() {
  return {
    name: 'my-plugin',
    transform: {
      filter: { id: idFilter },        // used by Rolldown / newer Rollup+Vite
      handler(code, id) {
        if (!idFilter.test(id)) return null  // needed only for older versions
        return transformedCode
      },
    },
  }
}
```
Keep the filter and the internal check in sync — older Rollup/Vite versions ignore
`filter` and call the handler for everything, so the internal check is what keeps
behavior correct there.

Hook Filters are supported in **Rollup 4.38.0+, Vite 6.3.0+, and all Rolldown
versions.**

## 8. Virtual modules

Standard pattern for injecting build-time data/helpers via normal ESM imports:

```ts
import { exactRegex } from '@rolldown/pluginutils'

export default function myPlugin() {
  const virtualModuleId = 'virtual:my-module'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'my-plugin',
    resolveId: {
      filter: { id: exactRegex(virtualModuleId) },
      handler() {
        return resolvedVirtualModuleId
      },
    },
    load: {
      filter: { id: exactRegex(resolvedVirtualModuleId) },
      handler() {
        return `export const msg = "from virtual module"`
      },
    },
  }
}
```
The `\0` prefix tells other plugins not to try to read/transform the module from
disk. The module is never actually read from disk — `resolveId` intercepts the
import, `load` supplies the source directly.

## 9. Behavioral differences vs. plain Rollup (be aware)

- In Rollup, all outputs are generated together in a single process; Rolldown's
  handling differs in some multi-output scenarios — check current docs for your
  specific multi-output setup before assuming 1:1 parity.
- `resolveDynamicImport` is Rollup-compat-only — always prefer `resolveId`.
- The internal TS/JSX transform timing (§3) is Rolldown-specific and has no Rollup
  equivalent, since Rollup doesn't natively transform TS/JSX at all.

## 10. Debugging

`vite-plugin-inspect` — visit `localhost:5173/__inspect/` after installing, to see
the live module/transform stack and which plugins touched which modules. Useful for
diagnosing exactly which hook is (or isn't) firing — including HMR investigation via
`hotUpdate`.

## 11. Native Rust plugins (beyond this doc's JS-facing API)

Everything above is Rolldown's **JS-facing** plugin API (Rollup-API-compatible,
running via a Rust↔JS bridge per call). Rolldown itself is Rust-native underneath,
and supports plugins written directly in Rust with no JS bridge — relevant if a hot
transform path is worth skipping the boundary cost entirely. This is a distinct,
lower-level surface from everything documented above; consult Rolldown's Rust crate
docs directly if pursuing that path, since it is a separate API from the JS Plugin
interface described here.

---

### Sources
- https://rolldown.rs/apis/plugin-api
- https://rolldown.rs/apis/plugin-api/hook-filters
- https://rolldown.rs/reference/interface.plugin
- https://rolldown.rs/reference/interface.plugincontext
- https://rolldown.rs/reference/interface.functionpluginhooks
- https://rolldown.rs/reference/typealias.objecthook
- https://rolldown.rs/reference/Interface.RolldownOptions
- https://vite.dev/guide/api-plugin
- https://vite.dev/blog/announcing-vite8
- https://rollupjs.org/plugin-development/ (for hooks Rolldown docs cross-reference)
