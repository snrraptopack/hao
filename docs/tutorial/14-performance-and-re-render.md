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