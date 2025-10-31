# 001 – createStore (Local structured state)

Status: Implemented, awaiting review

Overview
- createStore<T>(initial) provides a local, immutable state container with structural sharing and strong TypeScript types.
- It integrates with the existing reactive primitives via store.value (Ref<T>), so derive/watch/JSX reactive props work naturally.
- Scope is local by default (component/route/module). It is not a centralized global store unless you choose to export and use it as such.

API Surface
- Store<T>
  - value: Ref<T>
  - set(next: T): void
  - update(mutator: (prev: T) => T): void
  - patch(partial: Partial<T>): void // object roots only
  - branch<U>(get: (t: T) => U, put?: (root: T, sub: U) => T): SubStore<U>
  - updateAtKey<K extends keyof T>(key: K, mutator: (prev: T[K]) => T[K]): void
  - updateAt<U>(get: (t: T) => U, mutator: (prev: U) => U, put: (root: T, sub: U) => T): void

- SubStore<U>
  - value: Ref<U>
  - set(next: U): void
  - update(mutator: (prev: U) => U): void
  - updateAt<K extends keyof U>(key: K, next: U[K]): void

Key Guarantees
- Structural sharing: only the changed branch is copied; unchanged branches retain reference equality for performance.
- Batching: writes use the global scheduler (from state.ts), coalescing updates in microtasks.
- Type safety: generics enforce the shape of T and U across all operations.
- JSDoc: public APIs are documented in src/store.ts.

Usage Examples
```ts
type User = { id: number; name: string; active?: boolean }
const store = createStore<{ users: User[]; selectedId: number | null; byId: Record<number, User>}>({
  users: [], selectedId: null, byId: {}
})

// Top-level updates
store.patch({ selectedId: 42 })
store.update(prev => ({ ...prev, users: [{ id: 1, name: 'Alice' }] }))
store.updateAtKey('selectedId', id => id === 42 ? null : 42)

// Focused nested work with branch
const byId = store.branch(s => s.byId, (root, sub) => ({ ...root, byId: sub }))
byId.update(prev => ({ ...prev, 42: { ...prev[42], name: 'Bob' } }))
byId.updateAt(42 as any, { id: 42, name: 'Bob', active: true })

// Reactive reads
const selectedUserName = watch(store.value, (root) => {
  const id = root.selectedId
  return id == null ? null : root.byId[id]?.name ?? null
})
```

Best Practices
- Prefer patch for small, top-level changes; update for computed changes.
- Use updateAtKey for common top-level scalar edits without creating a branch.
- Use branch when repeatedly editing the same nested slice; it keeps intent clear and avoids rebuilding logic in many places.
- For read-only selectors, use derive/watch to compute projected values and bind them directly to JSX props.
- Avoid broad watch(store.value, ...) if you only care about a nested slice; compute a derived selector and subscribe to that value.

Naming Note
- "Store" is local by default here. If you prefer terminology that avoids any centralized connotation, we can alias or rename to createStruct or createShard. The API remains the same.

Constraints / Differences vs proposal
- updateAtKey works for top-level keys.
- General nested update requires a lens (get + put) for write-back to the root. We expose updateAt(get, mutator, put) for that use case and branch(get, put) when you need a focused SubStore.
- We avoided guessing write paths from selector functions to keep behavior explicit and type-safe.

Testing
- See tests/store.test.ts:
  - set/patch/update change the root and preserve structural sharing for unchanged branches.
  - branch updates write back into the root.
  - updateAtKey performs top-level scalar updates.

Open Questions for Review
- Naming: keep createStore or prefer createStruct/createShard?
- Do you want path-based helpers (setIn/updateIn) and/or lens helpers in the core, or ship them as optional utilities?
- Equality comparator hooks for SubStore writes (currently Object.is) — should we add an optional equals?: (a,b) => boolean?