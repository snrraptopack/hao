## Objectives
- Elevate developer experience with intuitive, reactive APIs distinct from React/Vue/Solid yet familiar.
- Implement lazy, dependency-tracked conditional rendering with function children.
- Strengthen fullstack integration via a first-class plugin connecting frontend ↔ backend.
- Formalize i18n with a dedicated module, scalable plugin, and docs.
- Improve performance measurably with expanded benchmarks, profiling, and renderer optimizations.
- Raise code quality through refactors, tests, linting, and contribution standards.

## Phase 1: Conditional Rendering System
- Implementation
  - Add function-children support in `appendChildren()` at `src/jsx.ts:35–98`:
    - Detect `typeof child === 'function'` before existing `isRef` handling.
    - Create `start/end` marker comments and append to `parent`.
    - Compute `derivedRef = derive(child)` using `src/state.ts:480–567`.
    - `render(v)` removes nodes between markers and inserts the returned node(s).
    - Initial render with `derivedRef.value`; re-render via `watch(derivedRef, render)` (`src/state.ts:300–417`).
  - Keyed list support inside function return:
    - Extract `key` in `h()` from `props.key` and store on element (e.g., `element.__key`), do not set as DOM attribute. Change in `src/jsx.ts:h()` `121–178`.
    - Implement keyed reconciliation between `start/end` markers for arrays by reusing LIS-based diff from `For()` at `src/jsxutils.tsx:306–632`.
  - Ensure cleanup integrates with component lifecycle (`src/lifecycle.ts:182–193` execute cleanup) and watch auto-disposal via current component context.
- Validation
  - Tests: add `tests/conditional-function-children.test.tsx` covering: if/else, ternary, `&&`, arrays, reordering with keys, nested functions.
  - Benchmarks: extend `apps/auwla-bench/src/main.tsx:1–86` with conditional cases and keyed array updates.
- Docs & Examples
  - Add tutorial page "Conditional Rendering" with function-children patterns and comparison to `<If>`/`<When>`.
  - Provide examples including normal `for` loops, `.map()`, nested conditionals, and keys.

## Phase 2: Fullstack Plugin Integration
- Design
  - Consolidate `fullstackPlugin` in `src/plugins/fullstack.ts:38–53` into a robust layer:
    - Define `defineApi()` that produces a typed client from endpoint descriptors (REST/Fetch/Hono).
    - Expose in plugin context via `AuwlaMetaContext` so pages/layouts can call `ctx.api.user.get()`.
    - Support server adapters (Hono, Bun HTTP) and environment-specific base URL resolution.
  - Meta layer integration `src/meta.ts:78–173` to inherit plugin context across layouts/pages.
- Examples
  - `meta-test/server/app-hono.ts` + `meta-test/src/pages/UserPage.tsx:1–67` showcase typed calls and error handling.
  - Provide example `auw/server/app-bun.ts` usage and client calls from `auw/src/routes.tsx`.
- Docs
  - Tutorials: "Fullstack Plugin" with setup, server adapters, typed client, error boundaries, retries.
  - API Reference: `fullstackPlugin`, `defineApi`, typing helpers.

## Phase 3: Internationalization (i18n)
- Module Restructure
  - Move dummy examples from index into `src/plugins/i18n/examples.tsx` (consumable snippets), remove sample code from any app `index` files.
- Scalable Plugin
  - Enhance `i18nPlugin()` in `src/plugins/i18n.ts:73–109`:
    - Loaders for lazy locale packs (`import()`), pluralization rules, message interpolation.
    - `setLocale()` triggers reactive updates across components via provided `Ref<string>`.
    - Fallback chains and warnings for missing keys (`94–99`).
- Integration
  - Provide `useI18n()` helper and context typing augmentation (existing `107–120`).
- Docs
  - "i18n Basics" and "Advanced i18n" tutorials with usage patterns, locale switching UI, dynamic packs.

## Phase 4: Developer Experience
- Intuitive APIs
  - Document the Auwla mental model: function-children, refs/derive/watch, typed meta contexts.
  - Provide ergonomic helpers: `createStore()`, `useRouter()`, `useDevTools()`.
- Errors & Debugging
  - Improve error messages via `onError()` (`src/lifecycle.ts:219–260`) and contextual hints (component name, plugin name).
  - Add warnings for invalid function-child returns (non-node, non-array), missing keys in large arrays, style attr misuse (`src/jsx.ts:244–246`).
- Devtools
  - Expand `src/devtools.ts:108–327` collectors with render timings and ref dependency graphs.
  - Enhance `src/devtools-ui.ts:21–99` overlay: filter by component, live ref inspector, hotkey.
- Learning Resources
  - Create guided tutorials: "Getting Started", "Conditional Rendering", "Fullstack", "i18n", "Performance".
  - Example gallery under `apps/examples/*`.

## Phase 5: Performance Optimization
- Metrics & Benchmarks
  - Standardize `performance.mark/measure` wrappers and export metrics; expand `apps/*-bench` to include conditionals, keyed diffs, and store updates.
  - Add cross-framework comparisons (React/Vue/Solid) alongside Auwla.
- Renderer Optimizations
  - Batch DOM updates around function-child re-renders; defer non-critical work to microtasks.
  - Reuse `For()` LIS implementation for minimal moves; cache class/style tokenization (`src/jsx.ts:206–301`).
- State/Scheduler
  - Ensure `watch()` dedupes and batches updates; refine equality checks (`src/state.ts:569–599`).
- Profiling Tools
  - Devtools: timeline view, slow watcher/component detection, per-page metrics export.

## Phase 6: Codebase Improvements
- Refactors
  - Review `src/jsx.ts`, `src/state.ts`, `src/jsxutils.tsx` for clarity and consistency; isolate keyed diff logic for reuse.
- Testing Infrastructure
  - Unit: expand tests under `tests/*` for new features.
  - Integration: typed routing + plugin contexts + i18n across pages.
  - E2E: Playwright harness for starter app `auw/` (routing, i18n switching, fullstack calls).
- Standards & CI
  - Add ESLint + Prettier configs; TypeScript strictness.
  - Contribution guidelines and code standards; CI with lint/test/build.

## Deliverables & Milestones
- Milestone 1: Conditional rendering (function children + keys), docs, tests, benchmarks.
- Milestone 2: Fullstack plugin API + examples + docs.
- Milestone 3: i18n module restructure + plugin enhancements + docs.
- Milestone 4: DX upgrades (errors/devtools/resources).
- Milestone 5: Performance suite expansion + renderer/state optimizations.
- Milestone 6: Codebase standards, tests, and CI.

## Acceptance Criteria
- Conditional function-children render lazily, track dependencies via `derive()`, reconcile keyed arrays efficiently.
- Fullstack plugin offers typed client, integrates with meta contexts, and ships examples and docs.
- i18n plugin supports lazy locale loading, fallback, reactive updates, and documented usage.
- Devtools expose profiling, helpful errors are emitted with context, tutorials available.
- Benchmarks show measurable wins; tests cover new functionality; linting and guidelines in place.

## Risks & Considerations
- Reactivity correctness: ensure `derive()` subscriptions are updated on dependency changes without leaks.
- Key usage consistency: document best practices; handle missing keys gracefully.
- SSR/hydration: plan future work; current scope focuses on client-rendering.
- Plugin compatibility: ensure fullstack/i18n coexist in `AuwlaMetaContext` types.