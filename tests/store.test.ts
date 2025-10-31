import { describe, test, expect } from 'vitest'
import { flush, flushSync } from '../src/state'
import { createStore } from '../src/store'

type User = { id: number; name: string; active?: boolean }

describe('store: createStore (local structured state)', () => {
  test('basic set/patch/update', async () => {
    const store = createStore<{ users: User[]; selectedId: number | null; byId: Record<number, User> }>({
      users: [], selectedId: null, byId: {}
    })

    // set
    store.set({ users: [], selectedId: 1, byId: {} })
    expect(store.value.value.selectedId).toBe(1)

    // patch
    store.patch({ selectedId: 2 })
    expect(store.value.value.selectedId).toBe(2)

    // update
    store.update(prev => ({ ...prev, selectedId: 3 }))
    expect(store.value.value.selectedId).toBe(3)
  })

  test('updateAtKey updates a top-level key', () => {
    const store = createStore({ a: 1, b: { x: 10 } })
    const prevRoot = store.value.value
    store.updateAtKey('a', (prev) => prev + 1)
    const nextRoot = store.value.value
    expect(nextRoot.a).toBe(2)
    // structural sharing: unchanged branch keeps reference
    expect(nextRoot.b).toBe(prevRoot.b)
  })

  test('branch update writes into root', async () => {
    const store = createStore<{ users: User[]; selectedId: number | null; byId: Record<number, User> }>({
      users: [], selectedId: null, byId: { 42: { id: 42, name: 'Alice' } }
    })
    const byId = store.branch(s => s.byId, (root, sub) => ({ ...root, byId: sub }))
    byId.update(prev => ({ ...prev, 42: { ...prev[42], name: 'Bob' } }))
    await flush()
    expect(store.value.value.byId[42].name).toBe('Bob')
  })

  test('branch updateAt shallow-updates a nested object key', () => {
    const store = createStore<{ byId: Record<number, User> }>({ byId: { 1: { id: 1, name: 'A' }, 2: { id: 2, name: 'B' } } })
    const byId = store.branch(s => s.byId, (root, sub) => ({ ...root, byId: sub }))
    const prevRoot = store.value.value
    byId.updateAt(1 as any, { id: 1, name: 'AA' })
    flushSync()
    const nextRoot = store.value.value
    expect(nextRoot.byId[1].name).toBe('AA')
    // unchanged keys preserved by reference
    expect(nextRoot.byId[2]).toBe(prevRoot.byId[2])
  })
})