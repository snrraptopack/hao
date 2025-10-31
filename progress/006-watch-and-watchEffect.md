# 006 – watch vs watchEffect (Typed separation of computed refs and side-effects)

Status: Implemented, awaiting review

Overview
- We split responsibilities so that computed values and side-effects are clearly distinguished and well-typed.
- watch(source, compute) is for computed reactive values and returns a Ref<R>.
- watchEffect(source, effect) is for side-effects and returns a cleanup function (() => void).
- This removes the ambiguous “Ref<R> | (() => void)” union at call sites and avoids TypeScript confusion like “Property 'value' does not exist on type 'Ref<any> | (() => void)'”.
- Type fixes: the implementation signatures now explicitly declare generics <T, R>, which resolved "Cannot find name 'T'" and "Cannot find name 'R'" errors.
- Devtools integration: watcher creation and cleanup are tracked for both computed and side-effect watchers.
- Scheduler: both APIs coalesce updates via a microtask scheduler and use shallowEqual to skip redundant work.

API
```ts
// Computed watcher – returns a Ref
export function watch<T, R>(
  source: Ref<T> | Ref<any>[],
  compute: (value: any, oldValue?: any) => R
): Ref<R>

// Side-effect watcher – returns a cleanup function
export function watchEffect<T>(
  source: Ref<T> | Ref<any>[],
  effect: (value: any, oldValue?: any) => void
): () => void
```

Behavior and Guarantees
- watch
  - Computes a derived value R when source(s) change and returns a Ref<R>.
  - Shallow change detection prevents unnecessary recompute on same-value updates.
  - Auto cleanup when used within a component watch context; otherwise manual cleanup is not needed because it returns a Ref (subscriptions are cleaned via the context or GC of subscribers).
- watchEffect
  - Runs effect whenever source(s) change.
  - Returns a cleanup function to unsubscribe; also auto-cleans within a component watch context.
  - Coalesces rapid source changes and passes both current and previous values to the effect.

Usage Examples
```ts
import { ref, watch, watchEffect, type Ref } from '../../src/state'

// Computed value from one source
const count = ref(0)
const doubled: Ref<number> = watch(count, n => n * 2)

// Computed value from multiple sources
const first = ref('Ada')
const last = ref('Lovelace')
const full = watch([first, last], ([f, l]) => `${f} ${l}`)

// Side-effect
const cleanup = watchEffect(count, (n, prev) => {
  console.log('count changed:', { n, prev })
})
// later
cleanup()
```

JSX binding example
```tsx
function Counter() {
  const count = ref(0)
  const label = watch(count, n => `Count: ${n}`)
  return <button onclick={() => (count.value += 1)}>{label.value}</button>
}
```

Migration Notes
- If you previously did side-effects with watch and captured a cleanup function:
  - Replace `const cleanup = watch(source, () => { /* side effects */ })` with `const cleanup = watchEffect(source, () => { /* side effects */ })`.
- If you used watch to produce computed refs, keep using it or consider derive for more advanced/dynamic dependency scenarios.
- In tests, side-effect usages were updated to use watchEffect (e.g., tests/state.test.ts and tests/scheduler.test.ts).
- Avoid relying on any-typed returns from watch for side-effects; prefer watchEffect for clarity and type-safety.

Best Practices
- Use watch for computed values when sources are explicit and fixed.
- Use derive for computed values that require dynamic dependency tracking (`derive(() => expr)`), or when you prefer a dedicated API that always returns a Ref.
- Use watchEffect for side-effects (logging, timers, imperative integrations, analytics) and keep compute functions pure.
- In components, rely on auto-cleanup via the watch context; otherwise, call the returned cleanup function from watchEffect when appropriate.

Testing
- Full test suite passes after updating side-effect cases to watchEffect.
- See tests/derive.test.ts for computed behavior and tests/state.test.ts & tests/scheduler.test.ts for watcher scheduling and side-effect patterns.

DevTools
- Both APIs emit watcher creation and destruction events with scope (component or global), aiding introspection.

Open Questions for Review
- Should we deprecate side-effect usage of watch in documentation entirely, pointing developers exclusively to watchEffect?
- Do we want configurable equality (e.g., equals?: (a,b) => boolean) on watch/derive for special cases?
- Should derive be highlighted as the primary computed API in docs, with watch positioned as a simpler alternative for explicit sources?