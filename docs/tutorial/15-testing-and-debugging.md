# Chapter 15 — Testing & Debugging

Lean tooling means you rely on TypeScript, console logs, and clear separation of concerns.

## TypeScript First
- Prefer explicit types in services.
- Annotate computed refs when inference gets fuzzy.

```ts
const hasError: Ref<boolean> = watch(error, (e) => !!e) as Ref<boolean>
```

## Error Display Pattern
```tsx
import { When } from '../../src/jsxutils'

function DataBlock({ loading, error, children }: any): HTMLElement {
  return (
    <When>
      {loading}
      {() => <div>Loading…</div>}
      {watch(error, (e) => !!e)}
      {() => <div class="text-red-600">Error: {error.value}</div>}
      {() => children}
    </When>
  )
}
```

## Debugging UI Primitives
- If you see `insertBefore` null errors, ensure wrappers and markers exist before render (fixed in `When`).
- Inspect DOM comments (`when-start`, `when-end`, `for-start`, `for-end`) to understand structure.

## Leak detection: timers & listeners
- Symptom: duplicate event handling, delayed actions firing too many times, memory creeping up.
- Cause: creating timers/listeners inside watchers without removing previous ones.

Checklist
- Search for `setTimeout`/`setInterval` and `addEventListener` inside watcher callbacks.
- Ensure you keep the current handle/target in closure and clear/remove it before creating a new one.
- Register component-level cleanup for the latest handle/target: `onUnmount(() => clearTimeout(t))`, `onUnmount(() => el?.removeEventListener(...))`.
- For network, prefer `createResource`/`fetch`: previous request is aborted automatically; in dev you’ll see `[resource:key] aborted` logs when cancellation happens.

Examples
```ts
// Proper timeout management
let t: any = null
onUnmount(() => { if (t) clearTimeout(t) })
watchEffect(query, () => {
  if (t) clearTimeout(t)
  t = setTimeout(() => doSearch(), 300)
})

// Proper listener management
let current: HTMLElement | null = null
const handler = (e: Event) => { /* ... */ }
onUnmount(() => { current?.removeEventListener('click', handler) })
watchEffect(selectedId, (id) => {
  if (current) current.removeEventListener('click', handler)
  const el = document.getElementById(id)
  if (el) { el.addEventListener('click', handler); current = el }
})
```

Timing helpers
- `flushSync()` drains pending reactive updates synchronously (useful to assert computed values immediately in tests).
- `await flush()` waits the scheduler microtask and the next animation frame (useful when the UI depends on scheduled updates).

See also: progress/009-best-practice-01-watchers-and-effects.md for a comprehensive guide.

## Exercise
- Add an error boundary wrapper with `When` to a page.
- Intentionally break a fetch URL and observe error handling.

## Checklist
- [ ] You lean on TS types in services.
- [ ] You display loading/error consistently.
- [ ] You understand DOM structure of `When`/`For` for debugging.