import { describe, it, expect } from 'vitest'
import {
  remote,
  defineMiddleware,
  runMiddleware,
  runWithContext,
  getContext,
  getParams,
  validate,
  ValidationError,
} from '../../src/server'
import type { ServerContext } from '../../src/server'

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/_auwla/rpc', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeContext(params: Record<string, string> = {}): ServerContext {
  return {
    request: makeRequest(),
    params,
    route: { path: '/test', params },
    locals: {},
    redirect: (path: string) => new Response(null, { status: 302, headers: { location: path } }),
  }
}

describe('server runtime', () => {
  it('remote.get creates a GET-branded function', () => {
    const fn = remote.get(async () => 'hello')
    expect(fn.__auwla_remote).toBe(true)
    expect(fn.method).toBe('GET')
    expect(fn.middleware).toEqual([])
  })

  it('remote.post creates a POST-branded function', () => {
    const fn = remote.post(async (_ctx, data: string) => data)
    expect(fn.__auwla_remote).toBe(true)
    expect(fn.method).toBe('POST')
  })

  it('remote.post accepts middleware array', () => {
    const mw = defineMiddleware(async (ctx, next) => {
      ctx.locals.before = true
      return next()
    })

    const fn = remote.post([mw], async (ctx) => ctx.locals.before)
    expect(fn.middleware).toHaveLength(1)
  })

  it('runWithContext provides context to getContext/getParams', async () => {
    const ctx = makeContext({ id: '42' })
    await runWithContext(ctx, async () => {
      expect(getContext()).toBe(ctx)
      expect(getParams()).toEqual({ id: '42' })
    })
  })

  it('getContext throws outside request context', () => {
    expect(() => getContext()).toThrow('[auwla/server]')
  })

  it('runs middleware in order', async () => {
    const order: string[] = []

    const mw1 = defineMiddleware(async (_ctx, next) => {
      order.push('mw1-before')
      await next()
      order.push('mw1-after')
    })

    const mw2 = defineMiddleware(async (_ctx, next) => {
      order.push('mw2-before')
      await next()
      order.push('mw2-after')
    })

    const ctx = makeContext()
    await runMiddleware(
      ctx,
      [mw1, mw2],
      async () => {
        order.push('handler')
        return 'done'
      },
    )

    expect(order).toEqual([
      'mw1-before',
      'mw2-before',
      'handler',
      'mw2-after',
      'mw1-after',
    ])
  })

  it('validate middleware parses and validates JSON body', async () => {
    const schema = {
      '~standard': {
        validate: (value: unknown) => {
          if (typeof value === 'object' && value !== null && 'title' in value) {
            return { value: (value as { title: string }).title }
          }
          return { issues: [{ message: 'title is required' }] }
        },
      },
    }

    const ctx = makeContext()
    ctx.request = makeRequest({ title: 'Hello' })

    await runMiddleware(
      ctx,
      [validate(schema)],
      async () => {
        expect(ctx.locals.input).toBe('Hello')
        return 'ok'
      },
    )
  })

  it('validate middleware throws ValidationError on invalid input', async () => {
    const schema = {
      '~standard': {
        validate: (_value: unknown) => ({
          issues: [{ message: 'invalid' }],
        }),
      },
    }

    const ctx = makeContext()
    ctx.request = makeRequest({})

    await expect(
      runMiddleware(
        ctx,
        [validate(schema)],
        async () => 'ok',
      ),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('validate middleware parses and validates FormData bodies', async () => {
    const schema = {
      '~standard': {
        validate: (value: unknown) => {
          if (typeof value === 'object' && value !== null && (value as { title: unknown }).title === 'Hello') {
            return { value: 'validated' }
          }
          return { issues: [{ message: 'title must be Hello' }] }
        },
      },
    }

    const form = new FormData()
    form.append('title', 'Hello')

    const ctx = makeContext()
    ctx.request = new Request('http://localhost/_auwla/rpc', {
      method: 'POST',
      body: form,
    })

    await runMiddleware(
      ctx,
      [validate(schema)],
      async () => {
        expect(ctx.locals.input).toBe('validated')
        return 'ok'
      },
    )
  })
})
