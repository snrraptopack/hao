# Auwla Server-Side Rendering (SSR) Architecture Proposal

## 1. Findings in the Current Codebase

Auwla has a highly unique architecture that splits component execution into two phases and utilizes two distinct compilation/execution paths.

### The Reactivity Model
- **Setup-Once:** Components are functions that run exactly once to initialize state, register cleanups, and initiate data fetching.
- **Render Closures:** Components return a closure that runs repeatedly on state changes. This closure is responsible for returning the DOM tree and is invoked automatically via microtasks when reactive cells invalidate.

### The Dual Path Execution
- **Compiler Mode (The Fast Path):** By default, the Vite plugin compiles JSX closures into highly optimized imperative DOM blocks (`__componentBlock`, `__cloneTemplate`, `__createBlock`, `__setText`).
- **Runtime Mode (The Bailout):** When the compiler encounters highly dynamic patterns (e.g., `<props.tag>`, unkeyed maps, setup state inside conditionals), it bails out locally. It drops a comment marker (`<!--auwla:child-->`) via `__setChild` and falls back to a runtime JSX factory (`h()`) to dynamically build `MemoElement`s.

### Data Loading
- Async tasks are tracked via `track.ts`, which wraps promises in a `TrackHandle` backed by a `ReactiveCell`. 
- The router integrates this via `routed`, executing loaders at the route level before navigating.

---

## 2. The Proposed SSR Approach

To achieve performant SSR, we must avoid generic render-to-string hacks (like JSDOM). The approach mirrors Auwla's dual-path architecture to squeeze out maximum performance.

### A. The SSR Compiler Target
We introduce an `ssr: true` mode in the Vite compiler plugin.
Instead of lowering JSX into DOM mutations (`__cloneTemplate`), the compiler lowers the JSX directly into **Template Literals (string concatenation)**. 

**Client Compiler Output:**
```ts
const el0 = __cloneTemplate("<div class=\"card\"></div>");
__setText(text0, item.id);
return __createBlock(() => ({ node: el0, update() { ... } }));
```

**SSR Compiler Output:**
```ts
return __ssrBlock(() => `<div class="card">${escapeHtml(item.id)}</div>`);
```
This means the fast path executes at native string concatenation speed on the server, completely skipping object allocation.

### B. The SSR Runtime (Bailout) Patch
When the compiler bails out, it falls back to the `h()` runtime factory. 
On the server, we patch `h()` to bypass `createMemoElement`. Instead, `h()` builds a very lightweight `SsrNode` (or returns a string immediately).
When the compiled template literal encounters a runtime child, the child simply stringifies itself and merges seamlessly into the output.

### C. Data Resolution & Streaming

**Synchronous Rendering (Phase 1)**
Since the router's `routed` fetches data at the navigation level, the server can await `routed` before rendering. By the time the component tree is evaluated, the `track` registry is populated. The component `setup()` runs, `track.get()` sees the data is `.resolved`, and the render closure executes **synchronously** to yield the final HTML string.

**Streaming Approach (Phase 2)**
Because the compiler transforms JSX into functions that push strings, we can absolutely support streaming (similar to SolidJS or React Server Components).
- The SSR compiler can be built to yield chunks (`IterableIterator<string | Promise<string>>`).
- When a component calls `track.get()` and it is `.pending`, the server immediately streams the HTML shell up to that point.
- It then suspends that chunk, waits for the `Promise` to resolve, and streams the rest of the HTML along with a `<script>` tag that injects the resolved data into the client's `track` registry.
- This provides an incredibly fast Time-To-First-Byte (TTFB).

### D. Client Hydration
If the server sends pre-rendered HTML strings, the client cannot use `__cloneTemplate` and wipe out the DOM.
We will introduce `__hydrateTemplate` in the client runtime. When a compiled component mounts, instead of cloning a `<template>`, it walks the existing `element.firstChild` structure to capture references (like `el0`, `text0`) and attaches event listeners. For runtime bailouts, the server will emit HTML comment markers (`<!--auwla:child-->`) so `__setChild` can anchor itself exactly where it needs to.

---

## Conclusion
Auwla is uniquely positioned to have industry-leading SSR performance. By compiling the fast path to native string literals and gracefully degrading to stringifiable runtime objects, we get the performance of SolidJS with the dynamic bailout safety of React. Adding streaming capabilities later will naturally map to Auwla's `track` promise architecture.
