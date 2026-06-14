import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { track, __resetTrackRegistry } from '../../src/events'
import type { StandardSchema } from '../../src/shared/standard-schema'

// Augment the server manifest types for these tests.
declare module 'auwla/server-manifest' {
  interface ServerManifestTypes {
    'posts.createPost': {
      method: 'POST'
      params: Record<string, never>
      args: [{ title: string }]
      return: { id: number; title: string }
    }
  }
}

const schema: StandardSchema = {
  '~standard': {
    validate: (value: unknown) => {
      if (typeof value === 'object' && value !== null && 'title' in value && (value as { title: unknown }).title !== '') {
        return { value }
      }
      return { issues: [{ message: 'title is required' }] }
    },
  },
}

describe('track.form', () => {
  beforeEach(() => {
    __resetTrackRegistry()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a lazy form handle', () => {
    const form = track.form('posts.createPost')
    expect(form.pending).toBe(false)
    expect(form.error).toBeNull()
  })

  it('validates client-side before sending', async () => {
    const form = track.form('posts.createPost', { schema })

    await expect(form.run({ title: '' })).rejects.toThrow('title is required')
    expect(form.error?.message).toContain('title is required')

    const mockFetch = vi.mocked(globalThis.fetch)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('sends the request when client validation passes', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 2, title: 'Created' }), { status: 200 }),
    )

    const form = track.form('posts.createPost', { schema })
    const result = await form.run({ title: 'New post' })

    expect(result).toEqual({ id: 2, title: 'Created' })
    expect(form.resolved).toBe(true)
    expect(form.error).toBeNull()
    expect(form.value?.title).toBe('Created')
  })

  it('handles onSubmit from a form element', async () => {
    const mockFetch = vi.mocked(globalThis.fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 3, title: 'From DOM' }), { status: 200 }),
    )

    const formElement = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'title'
    input.value = 'From DOM'
    formElement.appendChild(input)

    const form = track.form('posts.createPost', { schema })
    const submitEvent = new Event('submit', { cancelable: true, bubbles: true }) as SubmitEvent
    Object.defineProperty(submitEvent, 'currentTarget', { value: formElement, enumerable: true })

    form.onSubmit(submitEvent)

    await new Promise((r) => setTimeout(r, 10))

    expect(submitEvent.defaultPrevented).toBe(true)
    expect(form.resolved).toBe(true)
  })
})
