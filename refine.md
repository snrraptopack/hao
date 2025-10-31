Auwla src API Review and Refinement Plan

Summary
- The src/ directory exposes a coherent set of APIs: reactive state (ref/derive/watch), JSX runtime, router, routes helpers, lifecycle hooks, context, data-fetching helpers, DSL builder, and JSX utilities (When/For).
- The foundations are strong and approachable, but several areas can be modernized for performance, type-safety, and developer experience.
- Key themes: introduce a derive-based layer over ref/watch with an internal coalescing scheduler (not public); strengthen typed routing with precompiled patterns; a robust resource layer for data fetching (dedup, abort, SWR); unify JSX/DSL reactivity; reduce MutationObserver overhead; and tighten TypeScript surfaces. Context redesign is deferred.

High-Impact Recommendations (prioritized)
1) Reactive core: add derive() for pure computed values, keep watch() for side-effects, introduce createStore() for nested immutable data, and adopt an internal coalescing scheduler to batch updates automatically (no public batch API).
2) Data fetching: introduce createResource<T>() with keyed cache, abort controllers, dedup, stale-while-revalidate, and typed parsing.
3) Router: precompile route matchers, strengthen types from route definitions, and remove console debug; add path builders and named routes with type-safe params.
4) JSX/DSL: unify attribute updates with diffing, ensure event cleanup via lifecycle, minimize global MutationObserver usage.
5) App lifecycle: ensure unmount() performs DOM and lifecycle cleanup (not only innerHTML).

Details by Module

1. state.ts (Ref, watch, scheduler)
Observations
- Ref<T> uses a Proxy over { value, subscribe }, with a global microtask scheduler and flushSync/flush. watch() can return either a derived Ref or a cleanup function and uses shallowEqual for change detection.
- Auto-cleanup is supported via a watch context bound to Component.

Drawbacks
- Proxies are fine, but the API encourages manual subscribe usage in several places (DSL, JSX), which scatters reactivity logic and can lead to redundant computations.
- watch() couples two distinct concerns (derived/computed vs side-effect) and infers behavior from return type, which is clever but easy to misapply.
- Equality semantics rely on a custom shallowEqual with object heuristics; lacks an opt-in comparator for domain-specific equality.
- No built-in derive primitive with dependency tracking. Derived refs recompute when a source emits, but there’s no lazy evaluation, versioning, or internal coalescing description for multi-update transactions.

Recommendations
- Add derive<T>(fn): lazily evaluated, memoized based on dependency tracking; produces a read-only Ref that updates when sources change.
- Keep watch() strictly for side-effects/subscriptions; document it clearly and avoid deriving values through watch.
- Extend watch() with options: { equals?: (a, b) => boolean } for domain-specific equality, and document the overloads clearly.
- Provide createStore<T>(initial) for nested immutable data with structural sharing and typed branching APIs, plus helpers to target nested updates (branch(), updateAt()).
- Make batching/coalescing internal: updates schedule a single microtask flush that coalesces multiple changes without exposing a public batch() API.

Indicative API sketch (not a drop-in replacement)
  // Core
  const count = ref(0);
  const doubled = derive(() => count.value * 2);
  watch(doubled, (v) => {
    console.log('doubled', v);
  });
  // Updates coalesce internally; developers do not call any batch API.
  count.value++;
  count.value++;

  // Store
  const userStore = createStore({ users: [], selectedId: null, byId: {} as Record<number, { id: number; name: string }> });
  // Root patch
  userStore.patch({ selectedId: 42 });
  // Branch and update nested
  const byId = userStore.branch(s => s.byId, (root, sub) => ({ ...root, byId: sub }));
  byId.update(prev => ({ ...prev, 42: { id: 42, name: 'Alice' } }));
  // Targeted nested update without creating a branch
  userStore.updateAt(s => s.selectedId, prev => (prev === 42 ? null : 42));

Deep Dive: createStore semantics and usage
- Immutability with structural sharing: every write produces a new root object but reuses unchanged branches (e.g., shallow copies on the path being updated). This keeps updates fast and memory-friendly.
- store.value is a Ref<T>: read current state via store.value, subscribe with watch(store.value, ...) or derive(() => ...).
- patch(partial): shallow merge for top-level updates; ideal for simple flags or replacing small slices.
- update(mutator): single place to perform complex changes with full type safety. The mutator receives the previous immutable value and returns the next.
- branch(get, put?): focuses on a nested slice. get selects a sub-structure; put reconstructs the root from the updated slice. branch returns a SubStore<U> with its own value, set, update, and updateAt.
- updateAt(selector, mutator): target a nested value without creating a branch. selector reads the current nested value; mutator returns the next nested value. The root is rebuilt via structural sharing.
- Derived views: prefer derive(() => store.value.users.find(...)) for read-only selectors. These recompute only when their dependencies change.
- Side-effects: use watch(...) strictly for effects (logging, network, DOM). watch returns a cleanup function to unsubscribe, but it does not produce derived values.

Examples
  // Replace a user by id
  userStore.update(prev => ({
    ...prev,
    byId: { ...prev.byId, 42: { ...prev.byId[42], name: 'Bob' } },
  }));

  // Focus a branch and work locally
  const usersBranch = userStore.branch(s => s.users, (root, users) => ({ ...root, users }));
  usersBranch.update(users => users.map(u => (u.id === 42 ? { ...u, active: true } : u)));

  // Targeted nested scalar update
  userStore.updateAt(s => s.selectedId, id => (id === 42 ? null : 42));

2. jsx.ts, lifecycle.ts, dsl.ts, createElement.ts (view/runtime)
Observations
- JSX factory h() correctly establishes a ComponentContext and uses MutationObserver to trigger onMount and cleanup when elements are inserted/removed.
- appendChildren handles Ref children via text-node binding or marker blocks.
- DSL’s LayoutBuilder mixes subscribe() (not watch()) and manually tracks cleanups, and Component() mirrors lifecycle setup.

Drawbacks
- Per-component MutationObserver instances (including observers attached to document.body) can be expensive in large apps; multiple observers may be active concurrently.
- Event listeners aren’t explicitly removed on cleanup; removal is usually handled by GC when nodes are detached, but retaining references in closures can keep memory alive longer than necessary.
- JSX and DSL implement overlapping behaviors (class token diffing, style handling, attribute reflection) with slightly different mechanisms; this duplication increases maintenance burden.

Recommendations
- Centralize lifecycle attach/detach by using a single root observer per app or per router container. Option: observe container and dispatch connected/disconnected events to child components, rather than observing document.body per component.
- Unify reactive attribute handling in a shared util (applyClassTokens, applyStyle, setAttr) and ensure both JSX and DSL call the same helpers.
- Add onUnmount-managed event cleanup for listeners installed by the framework (e.g., delegated listeners). For element-level listeners, GC is adequate, but document-/window-level listeners must be removed.
- Consider keyed child reconciliation for generic arrays (opt-in), complementing For’s keyed behavior for lists when users pass array children directly.
- Document server-side rendering constraints (e.g., not relying on instanceof Node across realms) and guard for SSR/hydration later.

Example of unified attribute helper usage
  setReactiveAttr(el, key, maybeRefValue, { equals: Object.is });
  // Internally: initial set, subscribe via watch() with optional comparator, cleanup on unmount.

3. router.ts and routes.ts (routing)
Observations
- Router maintains currentPath, currentParams, currentQuery as refs and re-renders on path change. It builds regex on the fly for string paths and supports guards, layouts, and a routed lifecycle.
- routes.ts provides defineRoutes, group, composeRoutes, and pathFor for type-preserving route arrays.

Drawbacks
- Route matching is compiled per navigation and includes console logging; no caching of compiled patterns.
- Params are extracted as strings; there’s no typed decoding/coercion (e.g., numbers) or validation.
- The ambient AuwlaRouterAppPaths typing is useful but brittle; it requires manual synchronization with actual route declarations.
- Router’s state cache is an untyped Record<string, any>; no TTL/invalidation beyond manual methods; no prefetch/defer primitives.
- App unmount does not call router cleanup of the mounted route view.

Recommendations
- Precompile route matchers when routes are added and cache them. Remove console logs or gate under dev env.
- Strengthen route typing by deriving a NamedRoutes type from defineRoutes and group composition, eliminating the need for ambient declarations. Example: infer names/paths directly and expose pushNamed(name, params) as fully typed.
- Add decode/coerce hooks per param (e.g., number/string/uuid) and surface a pathFor() that enforces param types at compile time.
- Provide prefetchRoute(name, params) to warm caches and optionally integrate with createResource().
- Ensure app.unmount() triggers cleanup of the current rendered component via router.

API sketch for typed routes
  const routes = defineRoutes([
    { path: '/users/:id', name: 'user', component: UserPage },
  ]);
  type Routes = typeof routes;
  // pushNamed is inferred from Routes
  router.pushNamed('user', { id: 42 }); // type-safe

4. fetch.ts (data fetching)
Observations
- fetch<T>() returns { data, loading, error, refetch } and optionally caches results on router.state by cacheKey. asyncOp<T>() wraps arbitrary async work with the same shape.

Drawbacks
- No AbortController integration; requests continue even if components unmount or routes change.
- No deduplication of concurrent requests for the same cacheKey; no stale-while-revalidate semantics.
- No typed parsing/validation of responses; JSON is assumed.
- Cache keyed to router.state is convenient but not structured (no TTL, no status flags beyond refs).

Recommendations
- Introduce createResource<T>(key, fetcher, options) with:
  - Keyed caches (Map) supporting dedup and SWR.
  - AbortController for cancel-on-unmount and cancel-previous on revalidate.
  - Hooks for parse/validate (e.g., zod or user-supplied validator) and retry/backoff.
  - Status flags: { data, error, loading, stale, updatedAt }.
  - Optional integration with router.state for route-scoped caching.
- Keep fetch<T>() as a thin wrapper around createResource for simple cases.

Indicative API sketch
  const users = createResource('users', async (signal) => {
    const res = await window.fetch('/api/users', { signal });
    const json = await res.json();
    return json as User[]; // or validate(json)
  }, { staleTime: 30_000, revalidateOnFocus: true });
  // users: { data, loading, error, stale, refetch }

Abort and dedup semantics
- AbortSignal: the fetcher receives an AbortSignal. createResource creates an internal AbortController per request and passes its signal to your fetcher so you can forward it to window.fetch. When a new request supersedes an old one (e.g., revalidate or key change) or the component unmounts, the previous controller is aborted.
- Dedup: if a request for the same key is already in flight, subsequent callers reuse the same promise and signal rather than starting a second identical request.
- Stale-while-revalidate: when staleTime expires, data stays visible while a background revalidation starts; the previous request (if any) is aborted and a new one begins with a fresh controller.
- Cleanup: when the owner scope unmounts (e.g., route change), active requests are aborted and listeners are removed.

5. context.ts (Provider/useContext)
Deferred
The context design is under reconsideration and will be addressed separately. This review intentionally defers context changes and recommendations.

6. jsxutils.tsx (When/For)
Observations
- When pairs Ref<boolean> conditions with render functions and supports a final fallback; For implements keyed reconciliation using LIS.

Drawbacks
- When relies on pairing order; misuse is easy in complex JSX.
- For maintains a cache of nodes; if render functions capture large closures, stale nodes may prolong memory usage until removed.

Recommendations
- Validate When usage at runtime (development): warn on mismatched pairs or non-function fallback.
- Add optional placeholder/fallback props explicitly: When({ when: ref, then, else }).
- For: add an optional getNodeId hook for debug/devtools and document key uniqueness strongly.

7. app.ts (createApp)
Observations
- createApp wires a Router and container and calls start() on mount. unmount() clears innerHTML.

Drawbacks
- unmount() misses lifecycle cleanup of the currently rendered route component.

Recommendations
- Track the current child element and call its __cleanup() before clearing innerHTML.
- Optionally expose app.destroy() that also clears router listeners and caches.

Indicative change
  unmount() {
    const oldChild = container.firstChild as any;
    if (oldChild?.__cleanup) oldChild.__cleanup();
    container.innerHTML = '';
  }

8. Type-safety and DX (cross-cutting)
Recommendations
- Strengthen public types with explicit interfaces and generics; avoid any for caches and contexts.
- Prefer branded types for route names and paths derived from actual route arrays.
- Expose helper types (Ref<T>, Resource<T>, RouteMatch<P>) in index.ts to encourage consistent usage.
- Provide robust JSDoc on overloads (e.g., watch) and include small usage examples in docs.

9. Performance considerations
- Reduce the number of MutationObserver instances; prefer one per container or a centralized observer.
- Cache compiled route regexes and avoid re-building them on every navigation.
- Adopt an internal coalescing scheduler so multi-update sequences (e.g., router path/params/query updates) produce a single flush without a public batch API.
- In JSX attribute updates, use Object.is by default with an option to override equality for complex types.
- Consider micro-benchmarking appendChildren with large lists and ensure For is used for big collections.

10. Testing and reliability
- Add tests for:
  - watch derived vs side-effect paths and cleanup behavior.
  - Router matching and pathFor with params and query.
  - Resource cancellation on unmount and dedup behavior.
  - App unmount lifecycle cleanup.

Migration Strategy
Phase 1: Low-risk improvements
- Remove debug logs in router, cache compiled patterns.
- Add app.unmount cleanup.
- Move update coalescing into the internal scheduler so router/state/watch updates group automatically in one flush.
- Extract shared attribute/style/class helpers used by both JSX and DSL.

Phase 2: New primitives (opt-in)
- Implement derive() and createStore(); document interop with existing Ref/watch for a smooth rollout.
 - Implement createResource and migrate fetch<T>() internally to use it; keep fetch<T>() API stable.
  (Context redesign deferred.)

Phase 3: Type-safe routing
- Derive Names/Paths types directly from defineRoutes; update pushNamed, Link, and pathFor to use inferred types.

Phase 4: Runtime refinement
- Centralize lifecycle observer; minimize observers per component.
- Add event cleanup for global listeners; document element-level listener behavior.

Appendix: Minimal API sketches
Reactive primitives
  // Derive: creates a read-only Ref driven by other refs
  function derive<T>(fn: () => T): Ref<T>;
  // Watch: runs side-effects when deps change (cleanup optional)
  function watch<T>(source: Ref<T> | Ref<any>[], cb: (value: T | any[]) => void, options?: { equals?: (a: any, b: any) => boolean }): () => void;

Semantics
- ref<T>(initial): produces a mutable Ref with a .value property; setting .value schedules an internal coalesced flush. No public batch API.
- derive<T>(fn): creates a read-only Ref that recomputes when any of its dependent refs change. It is lazy and memoized; no side-effects should run inside derive.
- watch(source, cb): subscribes to changes and runs cb for side-effects. It does not produce values and should not be used to derive data. It returns a cleanup function to unsubscribe.

Resource
  type Resource<T> = {
    data: Ref<T | null>;
    error: Ref<string | null>;
    loading: Ref<boolean>;
    stale: Ref<boolean>;
    refetch: (opts?: { force?: boolean }) => Promise<void>;
  };
  function createResource<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>, options?: {
    staleTime?: number;
    revalidateOnFocus?: boolean;
    scope?: 'global' | 'route';
    parse?: (raw: unknown) => T;
  }): Resource<T>;

Store
  type SubStore<T> = {
    value: Ref<T>;
    set(next: T): void;
    update(mutator: (prev: T) => T): void;
    updateAt<K extends keyof T>(key: K, next: T[K]): void;
  };
  type Store<T> = {
    value: Ref<T>;
    set(next: T): void;
    update(mutator: (prev: T) => T): void;
    patch(partial: Partial<T>): void;
    branch<U>(get: (t: T) => U, put?: (root: T, sub: U) => T): SubStore<U>;
    updateAt<U>(selector: (t: T) => U, mutator: (prev: U) => U): void;
  };
  function createStore<T>(initial: T): Store<T>;

Typed Routes
  const routes = defineRoutes([
    { path: '/users/:id', name: 'user', component: UserPage },
    { path: '/search', name: 'search', component: SearchPage },
  ]);
  // infer Names = 'user' | 'search'; params for each path are enforced
  router.pushNamed('user', { id: 123 });

Closing Note
These changes keep the current developer experience while moving toward a modern, performant, and type-safe architecture. The proposed primitives (derive/store, resources) can be introduced incrementally without breaking existing apps, and they set a solid foundation for future features like SSR/hydration and advanced devtools. Context redesign is deferred for a future iteration.