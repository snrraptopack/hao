# Chapter 14 — Performance & Re-render Strategy

The framework favors fine-grained updates. Keep watches scoped, use keys, and avoid unnecessary recomputation.

## Principles
- Derive what you need with `watch`; don’t store everything.
- Use `key` in `For` to preserve DOM and focus.
- Avoid side-effect `watch`es that run too often; prefer computed refs.

## Common Patterns
```tsx
// Good: compute once, reuse
const filtered = watch([items, query], ([xs, q]) => filter(xs, q))

// Avoid: re-running map/filter inside render without refs
<ul>
  {/* Bad if xs is large and changes often */}
  {(items.value || []).map(/* ... */)}
</ul>
```

## Batching & Cleanup
- Watches inside a component auto-clean on unmount, keeping memory tidy.
- Render-time work should be minimal; push heavy logic into watchers.

## Do’s and Don’ts for Watchers & Effects
- Do use `derive()` or `watch()`-with-return for pure computation.
- Do use `createResource`/`fetch` for network tied to changing inputs (it aborts previous requests automatically).
- Don’t start timers/listeners inside watchers without clearing/removing the previous one.
- Prefer `onMount`/`onUnmount` for long-lived listeners/timers.
- If you must react to changing inputs with timers/listeners, keep the current handle/target in closure, clear/remove before creating a new one, and register a component-level cleanup.

```ts
// Good: resource-based latest-only search
const query = ref('')
const { data, loading, error, refetch } = fetch(() => `/api/search?q=${encodeURIComponent(query.value)}`, { cacheKey: 'search' })
watch(query, () => refetch())

// Bad: stacking timeouts
watchEffect(query, () => {
  setTimeout(() => /* ... */, 300)
})

// Good: clear previous timeout and clean up on unmount
let t: any = null
onUnmount(() => { if (t) clearTimeout(t) })
watchEffect(query, () => {
  if (t) clearTimeout(t)
  t = setTimeout(() => /* ... */, 300)
})
```

See also: progress/009-best-practice-01-watchers-and-effects.md for deeper guidance and examples.

## Measuring
- Use console timing around expensive transforms.
- Start simple; optimize hotspots (large lists, frequent updates).

## Exercise
- Profile a page with a big list. Move filtering/sorting into computed refs.
- Confirm fewer DOM operations using keys.

## Checklist
- [ ] You use computed refs for derived data.
- [ ] You set keys for reordering.
- [ ] You minimized render-time heavy work.