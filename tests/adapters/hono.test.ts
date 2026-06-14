import { describe, it, expect, vi } from 'vitest'
import { createHonoAdapter } from '../../src/adapters/hono'
import type { ServerManifest } from '../../src/server/types'

describe('hono adapter', () => {
  const manifest: ServerManifest = {
    'index.greet': {
      modulePath: 'mod:index',
      exportName: 'greet',
      method: 'GET',
      routePattern: '/',
      params: [],
      paramsType: 'Record<string, never>',
      argsType: ['string'],
      returnType: 'string',
    },
  }

  const load = async () => ({ greet: async (name: string) => `hi ${name}` })

  function makeRequest(payload: { key: string; args: unknown[]; routePath: string }): Request {
    return new Request('http://localhost/_auwla/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  function makeContext(request: Request) {
    return {
      req: { raw: request },
      next: vi.fn().mockResolvedValue(undefined),
    }
  }

  it('returns a response for RPC requests', async () => {
    const middleware = createHonoAdapter({ manifest, load })
    const request = makeRequest({ key: 'index.greet', args: ['hono'], routePath: '/' })
    const response = await middleware(makeContext(request))
    expect(response).toBeInstanceOf(Response)
    expect(response!.status).toBe(200)
    expect(await response!.text()).toContain('hi hono')
  })

  it('calls next for non-RPC requests', async () => {
    const middleware = createHonoAdapter({ manifest, load })
    const request = new Request('http://localhost/other')
    const c = makeContext(request)
    const response = await middleware(c)
    expect(response).toBeUndefined()
    expect(c.next).toHaveBeenCalled()
  })
})
