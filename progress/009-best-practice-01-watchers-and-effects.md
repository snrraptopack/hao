# 009 — Best Practice 01: Watchers, Side Effects, and Overlapping Async Work

Status: Completed

Why this matters
- It’s common to wire watchers directly to effects like API calls or timers:
  - `watch(searchQuery, async (q) => fetch(/api, q))`
  - `watch(searchQuery, (q) => setTimeout(() => doSearch(q), 1000))`
- Many developers assume the new run “replaces” the old one. In reality, without explicit cancellation, the old request/timer is still live. As inputs change quickly, overlapping work accumulates and produces spurious network traffic and odd timing edges.

What users typically think vs. what actually happens
- “My watcher keeps things up-to-date.”
  - True in spirit, but each rerun can start new async/timer work unless you cancel the previous run.
- “Unmount cleans everything.”
  - Our system auto-unsubscribes watcher subscriptions on unmount, but it does not cancel async work you started inside the watcher (fetches, timeouts, intervals) unless you explicitly do so.
- “Derived values are safe to compute in watchers.”
  - Yes—but prefer `derive()` or `watch()` returning a value for pure computation; keep side effects out of derived flows.

How our primitives behave
- watch(source, callback):
  - If `callback` returns a value, `watch` returns a derived Ref and recomputes in a microtask when `source` changes.
  - If `callback` returns void, `watch` installs side-effect subscriptions and returns a cleanup function (auto-added to the component cleanup set when used inside a Component).
  - Dedup: recomputes are batched; shallow equality gates redundant runs.
  - Important: `watch` does not cancel async/timers started by the callback.
- watchEffect(source, effect):
  - Dedicated to side effects; returns a cleanup function that auto-registers in component context.
  - Dedup and equality gating are the same as `watch`.
  - Important: It does not auto-cancel async/timers started by the effect.
- derive(...):
  - Always side‑effect‑free; returns a computed Ref.
  - Dynamic variant resubscribes only to refs actually read.
  - Safe from overlapping async work because it never starts any.
- createResource / fetch:
  - The recommended way to do request work tied to changing inputs.
  - Built-in protections:
    - Aborts previous in-flight request before starting a new one (AbortController).
    - Dedups concurrent starts; only one in flight unless forced.
    - Optional stale-while-revalidate: sets a stale timer and revalidates in the background.
    - Auto-cleanup (focus listeners, timers, controller) on unmount in component context.

The right path: practical guidance
1) For API calls tied to changing inputs, use createResource or fetch
- Define a resource keyed to the logical query and call `refetch()` when the input changes.
- You get: latest-only requests, cancellation via AbortController, dedup, stale handling, and unmount cleanup—all out of the box.
- Example shape:
  - `const { data, error, loading, refetch } = fetch<User[]>(() => makeUrl(searchQuery.value), { cacheKey: 'users' })`
  - `watch(searchQuery, () => refetch())`

2) For timers, prefer onMount/onUnmount for long-lived listeners; cancel before scheduling a new one
- If your timer does not depend on changing inputs, put `setInterval`/`setTimeout` in `onMount` and clean up with a return function or `onUnmount`.
- If your timer depends on changing inputs, keep the latest handle in closure and `clearTimeout`/`clearInterval` before scheduling the next.

3) Separate computed from effects
- Pure derived values belong in `derive()` or `watch()`-with-return.
- Side effects belong in `watchEffect()` or `watch()`-void and should manage cancellation explicitly.

4) “Latest-only” patterns if you must use watch/watchEffect for network
- Maintain an AbortController per run and abort the previous before starting a new request.
- Alternatively, keep a monotonically increasing token (sequence number) and ignore results that don’t match the latest token.
- These patterns are manual by design; use `createResource` when possible.

5) Avoid stacking event listeners in watchers
- Adding DOM or window listeners in a watcher without removing the previous one leads to leaks and duplicated handlers.
- Prefer `onMount`/`onUnmount` for listeners; if you add them in response to state changes, remove the previous listener first.

Anti-patterns and corrections
- Anti-pattern: Fetch inside watcher with no cancellation
  - Overlapping requests on fast input changes → wasted bandwidth and unpredictable ordering.
  - Correction: Use `createResource`/`fetch` or manually abort previous via AbortController before new fetch.
- Anti-pattern: setTimeout in watcher without clearing previous
  - Rapid state changes schedule many timers → stacked delayed effects.
  - Correction: Track the timeout handle in closure and clear it before scheduling a new one; or debounce at the input layer.
- Anti-pattern: Attaching listeners in watchers
  - Leads to multiple identical listeners.
  - Correction: Attach in `onMount`; detach in returned cleanup or `onUnmount`.

Debugging tips
- Watchers are auto-tracked in DevTools: creation and cleanup events are logged.
- Use scheduler APIs to reason about timing:
  - `flushSync()` to drain pending updates immediately.
  - `flush()` to await the microtask and next frame.
- Resources log aborts in dev on cancellation; check the console for `[resource:key] aborted` messages.

Quick reference
- Use `derive()` for computed values; never start side effects inside derive.
- Use `watch()` or `watchEffect()` for side effects; remember they don’t auto-cancel your async/timers.
- Prefer `createResource`/`fetch` for network bound to changing inputs—built-in abort, dedup, stale, and cleanup.
- Place long-lived listeners/timers in `onMount`/`onUnmount`.

Migration guide (from watcher-based fetch to resource)
- Old: `watch(query, async (q) => { const res = await fetch(...); data.value = await res.json(); })`
- New: `const { data, error, loading, refetch } = fetch(() => makeUrl(query.value), { cacheKey: 'myKey' }); watch(query, () => refetch());`
- Benefits: automatic cancellation, reduced race conditions, unified loading/error state, route-scoped caching when desired.

Related APIs and files
- Watchers and scheduling: `src/state.ts`
- Lifecycle (onMount/onUnmount, routed): `src/lifecycle.ts`
- Resource and data fetching: `src/resource.ts`, `src/fetch.ts`
- Router integration and state: `src/router.ts`

Notes
- This best practice complements Progress 006 (watch and watchEffect) and Progress 003 (createResource). Together they provide a clear separation: derive for computation, resource for network, watch/watchEffect for imperative effects with explicit cancellation.

---

Deeper dive: code-level patterns and examples

1) Network requests: avoid overlapping calls

Anti-pattern: raw fetch inside a watcher with no cancellation
```ts
import { ref, watchEffect } from '../src/state'

type SearchResult = { id: number; title: string }
const query = ref('')
const results = ref<SearchResult[]>([])

// ❌ Each rerun starts a new request; old ones keep running.
watchEffect(query, async (q) => {
  const res = await window.fetch(`/api/search?q=${encodeURIComponent(q)}`)
  results.value = (await res.json()) as SearchResult[]
})
```

Correct: use fetch/createResource for latest-only network with abort
```ts
import { ref, watch } from '../src/state'
import { fetch as useFetch } from '../src/fetch'

type SearchResult = { id: number; title: string }
const query = ref('')
const { data: results, loading, error, refetch } = useFetch<SearchResult[]>(
  () => `/api/search?q=${encodeURIComponent(query.value)}`,
  { cacheKey: 'search' }
)

// Drive network by input changes; previous request is aborted.
watch(query, () => refetch())
```

Manual alternative: AbortController inside watchEffect
```ts
import { ref, watchEffect } from '../src/state'
import { onUnmount } from '../src/lifecycle'

type SearchResult = { id: number; title: string }
const query = ref('')
const results = ref<SearchResult[]>([])

let ctrl: AbortController | null = null
onUnmount(() => { try { ctrl?.abort() } catch {} })

watchEffect(query, async (q) => {
  // Cancel any in-flight request
  if (ctrl) { try { ctrl.abort() } catch {} }
  ctrl = new AbortController()
  const signal = ctrl.signal

  try {
    const res = await window.fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal })
    results.value = (await res.json()) as SearchResult[]
  } catch (e: any) {
    if (!signal.aborted) {
      console.error('fetch error:', e)
    }
  }
})
```

Sequence-token guard (if you can’t abort)
```ts
import { ref, watchEffect } from '../src/state'

const query = ref('')
const results = ref<any[]>([])
let seq = 0

watchEffect(query, async (q) => {
  const token = ++seq
  const res = await window.fetch(`/api/search?q=${encodeURIComponent(q)}`)
  const json = await res.json()
  if (token !== seq) return // Ignore stale result
  results.value = json
})
```

2) Timers: clear previous and clean up on unmount

Anti-pattern: timer created on every change with no cleanup
```ts
import { ref, watchEffect } from '../src/state'

const delayMs = ref(500)

// ❌ Stacks timeouts if delay or triggering input changes quickly.
watchEffect(delayMs, (d) => {
  setTimeout(() => console.log('action at', d), d)
})
```

Correct: track the handle and clear before scheduling the next
```ts
import { ref, watchEffect } from '../src/state'
import { onUnmount } from '../src/lifecycle'

const delayMs = ref(500)
let timeoutId: number | null = null

onUnmount(() => {
  if (timeoutId != null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
})

watchEffect(delayMs, (d) => {
  if (timeoutId != null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  timeoutId = window.setTimeout(() => {
    console.log('action at', d)
    timeoutId = null
  }, d)
})
```

Debounced ref helper (compose derive/watchEffect + cleanup)
```ts
import { ref, type Ref, watchEffect } from '../src/state'
import { onUnmount } from '../src/lifecycle'

export function debounce<T>(source: Ref<T>, ms: number): Ref<T> {
  const out = ref(source.value)
  let t: any = null
  onUnmount(() => { if (t) clearTimeout(t) })
  watchEffect(source, (v) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => { out.value = v }, ms)
  })
  return out
}

// Usage
const query = ref('')
const debouncedQuery = debounce(query, 300)
```

Long-lived timers/listeners belong in onMount/onUnmount
```tsx
import { onMount } from '../src/lifecycle'

function Clock() {
  onMount(() => {
    const id = setInterval(() => console.log('tick'), 1000)
    return () => clearInterval(id)
  })
  return <div>Clock running…</div>
}
```

3) Event listeners: remove previous before adding new

Anti-pattern: adding listeners in a watcher without removing previous
```ts
import { ref, watchEffect } from '../src/state'

const selectedId = ref('btn-1')
function onClick() { console.log('clicked!') }

// ❌ Every change adds another listener → duplicate handlers.
watchEffect(selectedId, (id) => {
  const el = document.getElementById(id)
  el?.addEventListener('click', onClick)
})
```

Correct: track the current target and detach before attaching a new one
```ts
import { ref, watchEffect } from '../src/state'
import { onUnmount } from '../src/lifecycle'

const selectedId = ref('btn-1')
const handler = (e: Event) => console.log('clicked!')
let current: HTMLElement | null = null

onUnmount(() => {
  current?.removeEventListener('click', handler)
  current = null
})

watchEffect(selectedId, (id) => {
  if (current) {
    current.removeEventListener('click', handler)
    current = null
  }
  const el = document.getElementById(id)
  if (el) {
    el.addEventListener('click', handler)
    current = el
  }
})
```

Window listeners: prefer onMount/onUnmount
```ts
import { onMount } from '../src/lifecycle'

onMount(() => {
  const onScroll = () => {/* ... */}
  window.addEventListener('scroll', onScroll)
  return () => window.removeEventListener('scroll', onScroll)
})
```

4) Separate computation from effects
```ts
import { ref, derive, watchEffect } from '../src/state'

const query = ref('  Foo  ')
const sanitized = derive(query, (q) => q.trim().toLowerCase())

// Pure compute above, imperative effect below
watchEffect(sanitized, (q) => {
  console.log('Search with', q)
})
```

5) Global watchers: remember manual cleanup
```ts
import { ref, watchEffect } from '../src/state'

const online = ref(navigator.onLine)
const stop = watchEffect(online, (isOnline) => {
  console.log('Online?', isOnline)
})

// Later, when no longer needed:
stop() // ✅ Unsubscribes; global watchers don’t auto-clean on unmount
```

6) Timing: flushSync vs flush
```ts
import { ref, watch, flush, flushSync } from '../src/state'

const n = ref(0)
const doubled = watch(n, (v) => v * 2)

n.value = 5
flushSync()            // Synchronous drain of pending updates
console.log(doubled.value) // 10

n.value = 6
await flush()          // Await microtask + next frame
console.log(doubled.value) // 12
```

7) Router + resource example (stale + focus revalidate)
```ts
import { createResource } from '../src/resource'

type User = { id: string; name: string }
const { data, stale, loading, error, refetch } = createResource<User[]>(
  'users',
  async (signal) => {
    const res = await window.fetch('/api/users', { signal })
    return res.json()
  },
  { staleTime: 30_000, revalidateOnFocus: true, scope: 'route' }
)

// Somewhere in a watcher or routed handler
// if (stale.value) await refetch({ force: true })
```

Troubleshooting checklist
- Are you starting timers/listeners in watchers? Track the handle/target and clear/remove the previous before creating a new one.
- For network tied to changing inputs, prefer `createResource`/`fetch` to get automatic abort and cleanup.
- If you used raw fetch, ensure you abort previous (`AbortController`) or guard results with a sequence token.
- Long-lived listeners/timers (scroll, resize, intervals) belong in `onMount` with a returned cleanup.
- Global watchers (outside components) return a cleanup function—call it when you’re done.
