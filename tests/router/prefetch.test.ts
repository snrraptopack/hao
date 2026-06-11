/**
 * @fileoverview Tests for the prefetch registry.
 *
 * The registry is a thin module-level map. Tests verify:
 *   - registerPrefetches installs the map.
 *   - prefetchRoute calls the right function.
 *   - prefetchRoute is a no-op for unknown paths.
 *   - prefetchRoute swallows errors (no crash on failed prefetch).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerPrefetches, prefetchRoute } from '../../src/router/prefetch'
import type { PrefetchMap } from '../../src/router/prefetch'

beforeEach(() => {
  // Reset to empty registry between tests.
  registerPrefetches({})
})

describe('registerPrefetches + prefetchRoute', () => {
  it('calls the prefetch function for a registered path', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const map: PrefetchMap = { '/posts/:id': fn }

    registerPrefetches(map)
    prefetchRoute('/posts/:id')

    // Allow the microtask queue to flush.
    await Promise.resolve()
    expect(fn).toHaveBeenCalledOnce()
  })

  it('is a no-op for an unregistered path', () => {
    registerPrefetches({})
    // Must not throw.
    expect(() => prefetchRoute('/unknown')).not.toThrow()
  })

  it('is a no-op when no map has been registered', () => {
    // registerPrefetches was not called in this test.
    expect(() => prefetchRoute('/posts')).not.toThrow()
  })

  it('replaces the previous map on re-registration', async () => {
    const fn1 = vi.fn().mockResolvedValue(undefined)
    const fn2 = vi.fn().mockResolvedValue(undefined)

    registerPrefetches({ '/a': fn1 })
    registerPrefetches({ '/b': fn2 })

    prefetchRoute('/a')
    prefetchRoute('/b')

    await Promise.resolve()
    // fn1 must NOT have been called (its path is no longer registered).
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).toHaveBeenCalledOnce()
  })

  it('swallows prefetch errors so a failed chunk download does not crash the app', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'))
    registerPrefetches({ '/posts': fn })

    // Must not throw or produce an unhandled rejection.
    expect(() => prefetchRoute('/posts')).not.toThrow()

    // Wait for the rejected promise to settle.
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(fn).toHaveBeenCalledOnce()
  })

  it('is idempotent — calling prefetchRoute multiple times is safe', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    registerPrefetches({ '/about': fn })

    prefetchRoute('/about')
    prefetchRoute('/about')
    prefetchRoute('/about')

    await Promise.resolve()
    // The registry just calls the function — idempotency is the virtual
    // module's responsibility (__load cache). Here we just verify it calls.
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
