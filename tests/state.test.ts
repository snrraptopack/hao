import { describe, test, expect } from 'vitest'
import { ref, watch, watchEffect, flush, flushSync} from '../src/state'

describe('state: ref and watch', () => {
  test('ref subscribes and batches notifications', async () => {
    const a = ref(0)
    let calls = 0
    a.subscribe(() => { calls++ })

    a.value = 1
    a.value = 2
    // One microtask-batched notify
    await flush()
    expect(calls).toBe(1)
    expect(a.value).toBe(2)
  })

  test('flushSync drains immediately', () => {
    const a = ref(0)
    let calls = 0
    a.subscribe(() => { calls++ })
    a.value = 1
    flushSync()
    expect(calls).toBe(1)
  })

  test('watch returns computed ref', async () => {
    const a = ref(2)
    const doubled = watch(a, (v) => v * 2)
    expect(doubled.value).toBe(4)
    a.value = 10
    await flush()
    expect(doubled.value).toBe(20)
  })

  test('watchEffect side-effect returns cleanup', () => {
    const a = ref(1)
    let seen: number[] = []
    const cleanup = watchEffect(a, (v) => { seen.push(v) })
    a.value = 2
    flushSync()
    // watch side-effects run immediately with the current value, then on updates
    expect(seen).toEqual([1, 2])
    cleanup()
    a.value = 3
    flushSync()
    // No further pushes after cleanup
    expect(seen).toEqual([1, 2])
  })
})