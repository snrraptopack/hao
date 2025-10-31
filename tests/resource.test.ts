import { describe, test, expect, vi } from 'vitest'
import { createResource } from '../src/resource'
import { ref, flush, flushSync, setWatchContext } from '../src/state'

describe('createResource', () => {
  test('dedup: shared refs and single fetcher invocation for same key', async () => {
    let calls = 0
    const fetcher = async (_signal: AbortSignal) => {
      calls++
      await Promise.resolve()
      return { users: [1, 2, 3] }
    }

    const a = createResource('users', fetcher)
    const b = createResource('users', fetcher)

    // Shared refs
    expect(a.data).toBe(b.data)
    expect(a.loading).toBe(b.loading)

    // Trigger refetches concurrently; should dedup to a single fetcher call
    await Promise.all([a.refetch(), b.refetch()])
    expect(calls).toBe(1)
    expect(a.data.value).toEqual({ users: [1, 2, 3] })
    expect(b.data.value).toEqual({ users: [1, 2, 3] })
  })

  test('abort on unmount: in-flight request is cancelled', async () => {
    vi.useFakeTimers()
    let started = false
    let aborted = false
    const fetcher = async (signal: AbortSignal) => {
      started = true
      return await new Promise((resolve, reject) => {
        const onAbort = () => { aborted = true; reject(new Error('Aborted')) }
        signal.addEventListener('abort', onAbort)
        setTimeout(() => {
          signal.removeEventListener('abort', onAbort)
          resolve({ ok: true })
        }, 1000)
      })
    }

    const ctx = new Set<() => void>()
    setWatchContext(ctx)
    const res = createResource('slow', fetcher)
    // kick off
    const p = res.refetch()
    expect(started).toBe(true)
    // Unmount
    for (const cleanup of ctx) cleanup()
    vi.advanceTimersByTime(1000)
    expect(aborted).toBe(true)
    vi.useRealTimers()
    // After abort, loading should eventually settle false
    await p.catch(() => {})
    flushSync()
    expect(res.loading.value).toBe(false)
  })

  test('SWR: goes stale then revalidates in background', async () => {
    vi.useFakeTimers()
    let count = 0
    const fetcher = async (_signal: AbortSignal) => {
      count++
      await Promise.resolve()
      return { n: count }
    }
    const res = createResource('counter', fetcher, { staleTime: 50 })
    await res.refetch()
    expect(res.data.value).toEqual({ n: 1 })
    // After staleTime, stale should flip true and refetch in background
    vi.advanceTimersByTime(60)
    // Allow background revalidation promise and ref notifications to settle
    await Promise.resolve()
    await Promise.resolve()
    flushSync()
    expect(res.stale.value).toBe(false)
    expect(res.data.value).toEqual({ n: 2 })
    vi.useRealTimers()
  })
})