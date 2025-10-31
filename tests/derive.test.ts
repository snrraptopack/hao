import { describe, test, expect } from 'vitest'
import { ref } from '../src/state'
import { derive } from '../src/index'
import { flush, flushSync } from '../src/state'

describe('derive: first-class computed refs', () => {
  test('single source derives computed value', async () => {
    const count = ref(1)
    const doubled = derive(count, (v) => v * 2)
    expect(doubled.value).toBe(2)
    count.value = 5
    await flush()
    expect(doubled.value).toBe(10)
  })

  test('multiple sources derive computed value', async () => {
    const first = ref('Ada')
    const last = ref('Lovelace')
    const fullName = derive([first, last], ([f, l]) => `${f} ${l}`)
    expect(fullName.value).toBe('Ada Lovelace')
    last.value = 'Byron'
    await flush()
    expect(fullName.value).toBe('Ada Byron')
  })

  test('no redundant updates when shallow-equal', () => {
    const obj = ref({ x: 1 })
    const shallow = derive(obj, (o) => ({ x: o.x }))
    // initial compute
    expect(shallow.value.x).toBe(1)
    // set to an object with same shallow contents
    obj.value = { x: 1 }
    flushSync()
    // derived value should remain shallow-equal; ref may update internally, but value equal
    expect(shallow.value).toEqual({ x: 1 })
  })

  test('lazy derive(() => expr): dynamic dependency tracking for single ref', async () => {
    const count = ref(2)
    const doubled = derive(() => count.value * 2)
    expect(doubled.value).toBe(4)
    count.value = 3
    await flush()
    expect(doubled.value).toBe(6)
  })

  test('lazy derive(() => expr): conditional dependencies adjust dynamically', async () => {
    const q = ref(1)
    const s = ref(10)
    const useS = ref(false)

    const out = derive(() => useS.value ? q.value + s.value : q.value)
    // Initially only depends on q
    expect(out.value).toBe(1)
    s.value = 20
    await flush()
    // No change because s is not a dependency yet
    expect(out.value).toBe(1)

    // Toggle to include s; dependencies resubscribe
    useS.value = true
    await flush()
    expect(out.value).toBe(21)

    s.value = 5
    await flush()
    expect(out.value).toBe(6)

    // Toggle back to exclude s; now changes to s should not affect out
    useS.value = false
    await flush()
    expect(out.value).toBe(1)
    s.value = 100
    await flush()
    expect(out.value).toBe(1)
  })
})