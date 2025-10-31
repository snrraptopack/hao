import { describe, test, expect } from 'vitest'
import { Router } from '../src/router'
import { flush } from '../src/state'

describe('router basics', () => {
  test('push and query parsing', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const router = new Router([], container)

    router
      .add('/', () => {
        const el = document.createElement('div')
        el.textContent = 'Home'
        return el
      })
      .add('/a', () => {
        const el = document.createElement('div')
        el.textContent = 'A'
        return el
      })
      .start()

    router.push('/a?x=1&y=2')
    await flush()
    // currentQuery is a Ref; check value
    expect(router.currentQuery.value.x).toBe('1')
    expect(router.currentQuery.value.y).toBe('2')
  })

  test('guard prevents navigation', async () => {
    const container = document.createElement('div')
    const router = new Router([], container)
    router
      .add('/a', () => document.createElement('div'))
      .add('/secure', () => document.createElement('div'), { guard: () => false })
      .start()
    // Navigate to /a and wait for render so currentMatch is set
    router.push('/a')
    await flush()
    const before = router.currentPath.value
    // Attempt to navigate to guarded route; it should be blocked and revert to previous path
    router.push('/secure')
    await flush()
    expect(router.currentPath.value).toBe(before)
  })
})