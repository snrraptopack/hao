Progress Tracking

This folder records completed implementations and how developers can use them.

Process
- Each feature is implemented with typesafe APIs, JSDoc, and tests.
- After implementation, a dedicated markdown file documents:
  - What was added
  - Why it benefits developers (DX, performance, type-safety)
  - How to use it (examples)
  - Constraints and best practices
- Each entry is reviewed by the project owner before moving on to the next feature.

Index
- 001-createStore: Local structured state container (immutable, structural sharing) with branch and update helpers (pending review).
 - 002-derive: First-class computed refs with static and dynamic dependencies (derive(source, fn) and derive(() => expr)); prefer derive for dynamic dependencies; use watch for explicit sources and watchEffect for side-effects (pending review).
 - 003-createResource: Keyed data resources with dedup, abort via AbortController, and stale-while-revalidate; fetch<T>() now delegates to createResource (pending review).
 - 004-router-precompile: Precompile route regex matchers and cache them; remove noisy debug logs; app.unmount performs lifecycle cleanup of current view (pending review).
 - 005-typed-routing: Type-safe Router over route arrays; pushNamed/name/path params inferred; pathFor(pattern, params, query); optional param decoders and prefetch hooks (pending review).
 - 006-watch-and-watchEffect: Typed separation of computed refs (watch → Ref<R>) and side-effects (watchEffect → () => void); resolves union-type ambiguity and TS errors; tests updated (pending review).
 - 007-jsx-typing-and-runtime-refinement: Strengthened JSX intrinsic prop typing with Reactive<T> support, standardized children/key/ref, event handler types, and h() overloads; fixed ts(1109) and ts(2536); extended intrinsic coverage; tests and docs updated (pending review).
 - 008-dom-attrs-helpers: Centralized DOM attribute/style helpers (class token diffing, style object application, property-first setAttr) used by JSX runtime and DSL; reduced duplication and ensured consistent behavior (pending review).
 - 009-best-practice-01-watchers-and-effects: Guidance to avoid overlapping async/timer effects in watch/watchEffect; prefer createResource/fetch for network with built-in abort/dedup; use derive for pure computed values; place long-lived listeners in onMount/onUnmount; practical patterns and anti-patterns documented (pending review).