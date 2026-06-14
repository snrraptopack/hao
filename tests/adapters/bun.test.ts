import { describe, it, expect } from 'vitest'
import { createBunAdapter } from '../../src/adapters/bun'
import type { ServerManifest } from '../../src/server/types'

describe('bun adapter', () => {
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

  it('returns 404 for non-RPC requests', async () => {
    const fetch = createBunAdapter({ manifest, load })
    const response = await fetch(new Request('http://localhost/other'))
    expect(response.status).toBe(404)
  })

  it('handles RPC requests', async () => {
    const fetch = createBunAdapter({ manifest, load })
    const response = await fetch(makeRequest({ key: 'index.greet', args: ['bun'], routePath: '/' }))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('hi bun')
  })
})
