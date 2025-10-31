# 002 – derive (First-class computed refs)

Status: Implemented, awaiting review

Overview
- derive(source, compute) provides a clear API for creating computed reactive values that always return a Ref.
- derive(() => expr) adds lazy, dynamic dependency tracking: only refs actually read during compute are subscribed.
 - It complements watch by handling the “derived value” use case explicitly. Use watch when you have explicit sources; use watchEffect for side-effects.
- Integrates with the global scheduler and shallow change detection to avoid redundant work.

API
- derive<T, R>(source: Ref<T> | Ref<any>[], compute: (value: any, oldValue?: any) => R): Ref<R>
  - Static dependencies: explicitly subscribe to provided refs
  - compute receives current value(s) and optional old value(s);
  - returns a Ref<R> reflecting the computed value
- derive<R>(compute: () => R): Ref<R>
  - Dynamic dependencies: subscribes to refs actually read during compute
  - Dependencies are re-collected on each recompute; subscriptions adjust automatically
  - returns a Ref<R> reflecting the computed value

Behavior and Guarantees
- Always returns a Ref; never a cleanup function.
- Shallow change detection: recomputes only if the source value(s) change by shallowEqual.
- Coalesced updates: downstream subscribers are notified in a microtask batch (via the global scheduler).

Usage Examples
```ts
import { ref, derive } from 'auwla'

const count = ref(1)
const doubled = derive(count, v => v * 2)

const first = ref('Ada'), last = ref('Lovelace')
const fullName = derive([first, last], ([f, l]) => `${f} ${l}`)

// Lazy, dynamic tracking
const useLast = ref(false)
const dynamicName = derive(() => useLast.value ? `${first.value} ${last.value}` : first.value)
```

JSX binding
```tsx
const count = ref(0)
const doubled = derive(count, v => v * 2)

export const App = () => (
  <button onClick={() => count.value++}>
    Value: {count}, Doubled: {doubled}
  </button>
)
```

Best Practices
- Prefer derive for computed values, especially when you want dynamic dependency tracking (`derive(() => expr)`), and for a dedicated API that always returns a Ref.
- Use watch for computed values over explicit sources.
- Use watchEffect for side-effects (logging, analytics, timers, imperative integration).
- Keep compute functions pure: avoid side-effects within derive.
- For multi-source computations, pass an array of refs; compute receives [values] and optional [oldValues].
- When using derive(() => expr), prefer reading only the refs you need; conditional reads gate dependencies.

Interoperability
- derive(source, fn) remains implemented over watch’s derived branch for consistency.
- derive(() => expr) uses an internal derivation context to collect read refs dynamically and resubscribes when the set changes.
- Existing code using watch to produce derived refs remains valid; consider migrating to derive for clarity.
- Existing side-effect code written with watch should migrate to watchEffect for clear intent and typed cleanup.

Testing
- See tests/derive.test.ts for single/multi-source and shallow-equality behavior.

Static vs Dynamic Dependencies
- Static (derive(source, fn))
  - Pros: predictable subscriptions, simpler mental model
  - Cons: may recompute when unused sources change
- Dynamic (derive(() => expr))
  - Pros: subscribes only to refs actually read; conditional dependencies are supported
  - Cons: recomputation performs dependency re-collection; small overhead per run

Open Questions for Review
- Do we need options for equals?: (a,b) => boolean on derive, similar to potential watch options?
- Documentation: Should we add a “Reactive JSX binding semantics” section now and reference derive prominently?