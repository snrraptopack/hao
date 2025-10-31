import { describe, test, expect } from 'vitest'
import { ref, watch, watchEffect, derive, batch, flush, flushSync, untracked } from '../src/state'

describe('scheduler: coalescing and APIs', () => {
  test('watch dedups recomputation across multiple sources in one tick', async () => {
    const a = ref(0)
    const b = ref(0)
    let calls = 0
    const sum = watch([a, b], ([av, bv]) => {
      calls++
      return av + bv
    })
    // initial compute
    expect(sum.value).toBe(0)
    expect(calls).toBe(1)

    a.value = 1
    b.value = 2
    await flush()

    // Only one recomputation for both changes in same microtask
    expect(calls).toBe(2)
    expect(sum.value).toBe(3)
  })

  test('batch coalesces updates and flushes synchronously at the end', () => {
    const a = ref(0)
    let seen: number[] = []
    const cleanup = watchEffect(a, (v) => { seen.push(v) })
    // initial call
    expect(seen).toEqual([0])

    batch(() => {
      a.value = 1
      a.value = 2
      // No need to flush; batch will drain pending tasks synchronously on exit
    })

    expect(seen).toEqual([0, 2])
    cleanup()
  })

  test('untracked prevents dependency collection in dynamic derive', async () => {
    const a = ref(1)
    const b = ref(2)
    const computed = derive(() => {
      const x = a.value
      const y = untracked(() => b.value)
      return x + y
    })
    expect(computed.value).toBe(3)

    b.value = 3
    await flush()
    // derived did not re-run because b is read untracked
    expect(computed.value).toBe(3)

    a.value = 2
    await flush()
    expect(computed.value).toBe(5)
  })
})