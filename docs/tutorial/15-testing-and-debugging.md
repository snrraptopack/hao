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

## Exercise
- Add an error boundary wrapper with `When` to a page.
- Intentionally break a fetch URL and observe error handling.

## Checklist
- [ ] You lean on TS types in services.
- [ ] You display loading/error consistently.
- [ ] You understand DOM structure of `When`/`For` for debugging.