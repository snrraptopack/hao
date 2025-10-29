# Auwla Reactivity: Lazy Signals with Compile‑Time Pruning & Differential Programming

Status: Draft (Design Proposal)

## Purpose
- Explain two complementary techniques — Lazy Signals with Compile‑Time Pruning and Differential Programming — and how they integrate with Auwla’s current reactivity and scheduler.
- Provide a practical path to adopt them incrementally for real performance wins without sacrificing simplicity.

## Audience
- Auwla core contributors and advanced users building high‑performance UIs.

## TL;DR
- Lazy Signals: Create subscriptions on first read and prune watchers that never consume a signal. This reduces unnecessary propagation and watcher work.
- Differential Programming: Propagate deltas (minimal change descriptions) instead of full values; watchers apply patches rather than recomputing from scratch. This cuts CPU and DOM work.

---

## Background: Current Auwla Model
- `ref<T>()`: Basic reactive cell with `get()`/`set(value)` semantics.
- `watch(fn)`: Registers a reactive effect; dependencies tracked during `fn()` execution.
- Scheduler: Microtask batching via a pending set and `queueMicrotask`, plus `flushSync()` to synchronously drain and deliver updates (`src/state.ts`).
- Lists: `For` uses keyed reuse for stable DOM nodes; operations like “update‑all” and “shuffle” benefit from minimal DOM churn.

This design is simple and fast, but it still performs eager subscription and value delivery, which can do more work than necessary in complex views.

---

## Lazy Signals with Compile‑Time Pruning

### Concept
Only subscribe and deliver to effects that actually consume a signal. Defer creating the subscription until the signal is first read (“lazy”). Use compile‑time analysis where possible to prune effects that provably never read the signal (“pruning”).

### Why It Helps
- Cuts overhead from effects that are functionally unrelated to a change.
- Reduces dependency graph size in large components or long lists.
- Keeps hot paths lean by avoiding work for cold, rarely‑used branches.

### Behavioral Model
- Signals are “cold” by default; reading a signal inside an effect “warms” the subscription.
- Effects track a read set of signals during execution. If a signal isn’t read, the effect won’t re‑run for that signal’s changes.
- A compile‑time pass can mark effects as prunable for certain signals when static control‑flow proves no read occurs.

### Proposed API Sketch (non‑breaking additions)
```ts
// Keep current API: first arg is ref(s); add optional options.
const name = ref("Alice");

// Opt‑in lazy dependency capture without introducing new API names.
watch(name, (n) => {
  greet(n);
}, { lazyDeps: true });

// Multiple sources remain explicit; lazyDeps prunes unused subscriptions.
watch([items, filterText], ([list, q]) => {
  const needle = q.toLowerCase();
  return needle ? list.filter(x => String(x.value.value).includes(needle)) : list;
}, { lazyDeps: true });
```

Note: The above can be delivered with runtime instrumentation alone. A later bundler plugin can add compile‑time pruning based on simple patterns.

### Runtime Implementation Notes
- Instrument `.value` reads in watcher callbacks to lazily register subscriptions on first use.
- Maintain per‑watcher read sets; clear and rebuild on each callback re‑execution to reflect control‑flow changes.
- Delivery: When a signal changes, only schedule watchers that have that signal in their read set.
- Scheduler stays the same (microtask queue + `flushSync()`), but fewer watchers are enqueued.

### Compile‑Time Pruning (Optional Extension)
- A light transform scans common patterns and annotates watcher callbacks that cannot read a given signal (e.g., unconditional constants, obviously unrelated scope).
- The runtime uses annotations to skip even the first execution subscription attempt for pruned signals.

### Example: Filtered List
```ts
const filterText = ref("");
const items = ref(initialItems);

// Only watchers that actually read `filterText` will subscribe to it.
watch([items, filterText], ([list, q]) => {
  const needle = q.toLowerCase();
  const visible = needle ? list.filter(x => String(x.value.value).includes(needle)) : list;
  renderList(visible);
}, { lazyDeps: true });
```
Results: When `items` change but `filterText` does not, effects that never read `filterText` won’t run. Likewise, on typing, only the filter‑consuming effects run.

---

## Differential Programming

### Concept
Represent changes as deltas and propagate those deltas to effects. Rather than re‑computing from full values, effects apply patches. Examples: text change, swap, move, insert/delete.

### Why It Helps
- Avoids reprocessing unchanged data (e.g., re‑filtering entire lists on small changes).
- Minimizes DOM work by translating list changes to keyed patch operations.
- Enables cache reuse and structural sharing.

### Diff Shapes (Examples)
```ts
// Primitive diff
type TextDiff = { kind: 'text', index: number, value: string };

// Reordering diff
type MoveDiff = { kind: 'move', from: number, to: number };

// List patch (simplified)
type ListDiff<T> =
  | { kind: 'insert', index: number, item: T }
  | { kind: 'delete', index: number }
  | { kind: 'update', index: number, patch: Partial<T> }
  | { kind: 'move', from: number, to: number };
```

### Proposed API Sketch (optional additions)
```ts
// A variation of ref for arrays that reports diffs when possible.
const list = ref<Array<Item>>(initial /*, { diff: true }*/);

// Watchers can opt into receiving diffs (name TBD; design sketch).
watchDiff(list, (diff: ListDiff<Item>) => {
  applyListPatch(domList, diff);
});

// Fallback: if no diff is available, fall back to full recompute.
watch(list, (items) => renderList(items));
```

### Runtime Implementation Notes
- Change producers (e.g., shuffle) emit delta events when they can.
- The ref stores both the current value and (optionally) a bounded history or a patch generator for recent changes.
- Delivery path distinguishes “value” vs “delta” notification; effects that opt into diffs get the delta first.
- Integrates cleanly with keyed `For`:
  - `move` → `insertBefore`/`append` with existing nodes.
  - `update` → minimal text/attr updates.
  - `insert`/`delete` → localized create/destroy.

### Examples
- Update‑All (text changes): emit `update` diffs per item; text nodes update without re‑filtering or reshaping the list.
- Shuffle: emit `move` diffs for keys; DOM performs minimal `insertBefore` on reused nodes.
- Typing Filter: emit `text` diffs for the filter signal; downstream list operations can avoid re‑rendering nodes that don’t change visibility.

### Scheduler Integration
- The microtask scheduler queues diff deliveries identically to value deliveries.
- `flushSync()` remains valid; it drains both value and delta deliveries immediately.
- Batching: multiple diffs coalesce, respecting ordering to keep DOM consistent.

---

## Instrumentation & Measurement
- Sync Mode (engine overhead): Start before mutation; stop after `flushSync()` when all pending deliveries are drained.
- After Paint Mode (user‑perceived): Start before mutation; stop on second `requestAnimationFrame` to capture layout + paint.
- Report both where useful; use After Paint for cross‑framework comparisons.

---

## Migration Plan (Phased)
1) Instrument reads and build per‑effect read sets (runtime only).
2) Enable `lazyDeps` and optional `{ lazy: true }` on `ref()`.
3) Introduce diff delivery for common operations (`update`, `move`, `insert`, `delete`).
4) Add a lightweight compile‑time pass for pruning in simple patterns.
5) Devtools support: visualize hot vs cold effects, diff streams, and delivery order.

### Acceptance Criteria
- Reduce effect executions on update‑all and shuffle by ≥30% in 800/2000‑item benches.
- Lower DOM operations (measured via mutation observers or browser instrumentation) on shuffle by ≥40%.
- Maintain correctness under `flushSync()` and batched microtask delivery.

### Risks & Mitigations
- Complexity: Keep APIs opt‑in and preserve current behavior by default.
- Debuggability: Add devtools views for subscriptions, diffs, and scheduling.
- Code size: Prefer runtime instrumentation first; keep compile pass minimal.

---

## Glossary
- Signal/Ref: Reactive source that supports reads (`.value`) and writes (`.value = x`).
- Watch: Function re‑executed when dependencies change.
- Lazy: Deferring subscription creation until first read.
- Pruning: Compile‑time elimination of subscriptions for signals never read by an effect.
- Diff/Delta: Minimal change description propagated instead of full values.

## Notes
This is a design document. APIs shown are sketches to convey intent; the current Auwla APIs (`ref`, `watch`, `For`, `flushSync`) remain the source of truth until these additions land.