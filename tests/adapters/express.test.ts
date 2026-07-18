import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createExpressAdapter } from '../../src/adapters/express'
import type { ServerManifest } from '../../src/server/types'

function makeReq(method: string, url: string, body?: string, headers: Record<string, string> = {}): IncomingMessage {
  const stream = new Readable({
    read() {
      if (body) this.push(body)
      this.push(null)
    },
  })
  const req = stream as unknown as IncomingMessage
  req.method = method
  req.url = url
  req.headers = { host: 'localhost', ...headers }
  return req
}

type FakeRes = {
  statusCode: number
  headers: Record<string, string>
  finished: boolean
  body: string
}

function makeRes(): { res: ServerResponse; state: FakeRes } {
  const chunks: Buffer[] = []
  const state: FakeRes = { statusCode: 200, headers: {}, finished: false, body: '' }
  const res = {
    get statusCode() { return state.statusCode },
    set statusCode(code: number) { state.statusCode = code },
    setHeader(name: string, value: string) { state.headers[name.toLowerCase()] = value },
    write(chunk: Buffer) { chunks.push(chunk) },
    end(chunk?: Buffer) {
      if (chunk) chunks.push(chunk)
      state.body = Buffer.concat(chunks).toString()
      state.finished = true
    },
    destroy() { state.finished = true },
  } as unknown as ServerResponse
  return { res, state }
}

describe('express adapter', () => {
  const manifest: ServerManifest = {
    'index.greet': {
      modulePath: 'mod:index',
      exportName: 'greet',
      method: 'POST',
      routePattern: '/',
      params: [],
      paramsType: 'Record<string, never>',
      argsType: ['string'],
      returnType: 'string',
    },
  }

  const load = async () => ({ greet: async (name: string) => `hi ${name}` })

  it('serves RPC requests and pumps the response', async () => {
    const middleware = createExpressAdapter({ manifest, load })
    const req = makeReq('POST', '/_auwla/rpc', JSON.stringify({ key: 'index.greet', args: ['express'], routePath: '/' }), {
      'content-type': 'application/json',
    })
    const { res, state } = makeRes()

    await new Promise<void>((resolve, reject) => {
      middleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()))
      const interval = setInterval(() => {
        if (state.finished) {
          clearInterval(interval)
          resolve()
        }
      }, 1)
    })

    expect(state.statusCode).toBe(200)
    expect(state.body).toContain('hi express')
  })

  it('passes non-RPC requests to next()', async () => {
    const middleware = createExpressAdapter({ manifest, load })
    const req = makeReq('GET', '/other')
    const { res } = makeRes()

    const nextCalled = await new Promise<boolean>((resolve) => {
      middleware(req, res, () => resolve(true))
      setTimeout(() => resolve(false), 50)
    })

    expect(nextCalled).toBe(true)
  })
})
