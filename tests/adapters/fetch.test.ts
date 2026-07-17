import { describe, it, expect } from 'vitest'
import { createFetchAdapter, extractRouteParams } from '../../src/adapters/fetch'
import { remote, defineMiddleware, validate } from '../../src/server'
import type { ServerManifest } from '../../src/server/types'

describe('fetch adapter', () => {
  const buildManifest = (): ServerManifest => ({
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
    'posts.getPost': {
      modulePath: 'mod:posts',
      exportName: 'getPost',
      method: 'GET',
      routePattern: '/posts/:id',
      params: ['id'],
      paramsType: '{ id: string }',
      argsType: [],
      returnType: 'string',
    },
    'posts.createPost': {
      modulePath: 'mod:posts',
      exportName: 'createPost',
      method: 'POST',
      routePattern: '/posts',
      params: [],
      paramsType: 'Record<string, never>',
      argsType: ['{ title: string }'],
      returnType: '{ id: string }',
    },
    'catchall.getSlug': {
      modulePath: 'mod:catchall',
      exportName: 'getSlug',
      method: 'GET',
      routePattern: '/docs/*',
      params: ['slug'],
      paramsType: '{ slug: string[] }',
      argsType: [],
      returnType: 'string[]',
    },
  })

  const buildModules = (): Record<string, Record<string, unknown>> => ({
    'mod:index': {
      greet: async (name: string) => `hello ${name}`,
    },
    'mod:posts': {
      getPost: remote.get(async (ctx) => `post-${ctx.params.id}`),
      createPost: remote.post(
        [validate({
          '~standard': {
            validate: (value: unknown) => {
              if (typeof value === 'object' && value !== null && 'title' in value) {
                return { value: (value as { title: string }).title }
              }
              return { issues: [{ message: 'title is required' }] }
            },
          },
        })],
        async (ctx, title: string) => {
          return { id: '1', title, author: ctx.locals.user }
        },
      ),
    },
    'mod:catchall': {
      getSlug: remote.get(async (ctx) => ctx.params.slug),
    },
  })

  function makeAdapter() {
    const modules = buildModules()
    return createFetchAdapter({
      manifest: buildManifest(),
      load: async (modulePath) => modules[modulePath]!,
    })
  }

  function makeRpcRequest(payload: { key: string; args: unknown[]; routePath: string }): Request {
    const manifest = buildManifest()
    const entry = manifest[payload.key]
    const method = entry?.method ?? 'POST'

    if (method === 'GET') {
      const url = new URL('http://localhost/_auwla/rpc')
      url.searchParams.set('key', payload.key)
      url.searchParams.set('routePath', payload.routePath)
      if (payload.args.length > 0) {
        url.searchParams.set('args', JSON.stringify(payload.args))
      }
      return new Request(url.toString(), {
        method: 'GET',
        headers: { 'accept': 'application/json' },
      })
    }

    return new Request('http://localhost/_auwla/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  it('ignores requests outside the RPC path', async () => {
    const handle = makeAdapter()
    const response = await handle(new Request('http://localhost/other'))
    expect(response).toBeUndefined()
  })

  it('rejects GET method on POST endpoints', async () => {
    const handle = makeAdapter()
    const response = await handle(new Request('http://localhost/_auwla/rpc?key=posts.createPost', { method: 'GET' }))
    expect(response?.status).toBe(405)
  })

  it('rejects a mismatched routePath even when client routeParams are supplied', async () => {
    // S1 regression: /dashboard does not match /posts/:id — the crafted
    // client-side params must not be trusted.
    const handle = makeAdapter()
    const url = 'http://localhost/_auwla/rpc?key=posts.getPost&routePath=/dashboard&params=' +
      encodeURIComponent(JSON.stringify({ id: '99' }))
    const request = new Request(url, { method: 'GET' })
    const response = await handle(request)
    expect(response?.status).toBe(400)
    expect(await response!.text()).not.toContain('post-99')
  })

  it('invokes a plain async function', async () => {
    const handle = makeAdapter()
    const response = await handle(makeRpcRequest({ key: 'index.greet', args: ['world'], routePath: '/' }))
    expect(response?.status).toBe(200)
    const text = await response!.text()
    expect(text).toContain('hello world')
  })

  it('invokes a remote.get function and exposes context params', async () => {
    const handle = makeAdapter()
    const response = await handle(makeRpcRequest({ key: 'posts.getPost', args: [], routePath: '/posts/42' }))
    expect(response?.status).toBe(200)
    expect(await response!.text()).toContain('post-42')
  })

  it('runs middleware and validation for remote.post', async () => {
    const modules = buildModules()
    const auth = defineMiddleware<{ id: string }>(async (ctx, next) => {
      ctx.locals.user = 'alice'
      return next()
    })

    modules['mod:posts']!.createPost = remote.post(
      [auth, validate({
        '~standard': {
          validate: (value: unknown) => {
            if (typeof value === 'object' && value !== null && 'title' in value) {
              return { value: (value as { title: string }).title }
            }
            return { issues: [{ message: 'title is required' }] }
          },
        },
      })],
      async (ctx) => ({ id: '1', title: ctx.locals.input, author: ctx.locals.user }),
    )

    const adapter = createFetchAdapter({
      manifest: buildManifest(),
      load: async (modulePath) => modules[modulePath]!,
    })

    const response = await adapter(makeRpcRequest({ key: 'posts.createPost', args: [{ title: 'Hi' }], routePath: '/posts' }))
    expect(response?.status).toBe(200)
    const parsed = await response!.text()
    expect(parsed).toContain('Hi')
    expect(parsed).toContain('alice')
  })

  it('returns 400 for validation errors', async () => {
    const handle = makeAdapter()
    const response = await handle(makeRpcRequest({ key: 'posts.createPost', args: [{}], routePath: '/posts' }))
    expect(response?.status).toBe(400)
    const body = JSON.parse(await response!.text()) as { message: string }
    expect(body.message).toContain('title is required')
  })

  it('extracts catch-all slug params as an array', async () => {
    const handle = makeAdapter()
    const response = await handle(makeRpcRequest({ key: 'catchall.getSlug', args: [], routePath: '/docs/a/b/c' }))
    expect(response?.status).toBe(200)
    const text = await response!.text()
    expect(text).toContain('a')
    expect(text).toContain('c')
  })

  it('accepts FormData payloads', async () => {
    const handle = makeAdapter()
    const form = new FormData()
    form.append('__auwla_key', 'index.greet')
    form.append('__auwla_routePath', '/')
    form.append('name', 'formuser')

    const response = await handle(
      new Request('http://localhost/_auwla/rpc', {
        method: 'POST',
        headers: { 'accept': 'application/json' },
        body: form,
      }),
    )
    expect(response?.status).toBe(200)
  })

  it('returns 500 for unknown remote keys', async () => {
    const handle = makeAdapter()
    const response = await handle(makeRpcRequest({ key: 'missing.key', args: [], routePath: '/' }))
    expect(response?.status).toBe(500)
  })

  it('handles HttpError exceptions and returns the correct status and details', async () => {
    const modules = buildModules()
    modules['mod:posts']!.getPost = remote.get(async () => {
      const { NotFoundError } = await import('../../src/server')
      throw new NotFoundError('Post not found')
    })

    const adapter = createFetchAdapter({
      manifest: buildManifest(),
      load: async (modulePath) => modules[modulePath]!,
    })

    const response = await adapter(makeRpcRequest({ key: 'posts.getPost', args: [], routePath: '/posts/42' }))
    expect(response?.status).toBe(404)
    const json = JSON.parse(await response!.text())
    expect(json.name).toBe('NotFoundError')
    expect(json.message).toBe('Post not found')
  })

  it('propagates custom headers from context.headers to the response', async () => {
    const modules = buildModules()
    modules['mod:posts']!.getPost = remote.get(async (ctx) => {
      ctx.headers.set('X-Test-Header', 'custom-value')
      return 'ok'
    })

    const adapter = createFetchAdapter({
      manifest: buildManifest(),
      load: async (modulePath) => modules[modulePath]!,
    })

    const response = await adapter(makeRpcRequest({ key: 'posts.getPost', args: [], routePath: '/posts/42' }))
    expect(response?.status).toBe(200)
    expect(response?.headers.get('X-Test-Header')).toBe('custom-value')
  })

  it('parses request cookies and appends Set-Cookie headers for set/delete', async () => {
    const modules = buildModules()
    modules['mod:posts']!.getPost = remote.get(async (ctx) => {
      const val = ctx.cookies.get('user_session')
      ctx.cookies.set('resp_cookie', `${val}-response`, { httpOnly: true })
      ctx.cookies.delete('old_cookie')
      return 'ok'
    })

    const adapter = createFetchAdapter({
      manifest: buildManifest(),
      load: async (modulePath) => modules[modulePath]!,
    })

    const request = makeRpcRequest({ key: 'posts.getPost', args: [], routePath: '/posts/42' })
    request.headers.set('Cookie', 'user_session=token123; other=abc')

    const response = await adapter(request)
    expect(response?.status).toBe(200)
    
    const setCookie = response?.headers.get('set-cookie')
    expect(setCookie).toContain('resp_cookie=token123-response')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('old_cookie=')
    expect(setCookie).toContain('Max-Age=0')
  })

  it('executes global middlewares for both remote functions and plain async functions', async () => {
    const modules = buildModules()
    const log: string[] = []

    const globalMw = defineMiddleware(async (ctx, next) => {
      log.push('global-before')
      await next()
      log.push('global-after')
    })

    const localMw = defineMiddleware(async (ctx, next) => {
      log.push('local')
      return next()
    })
    modules['mod:posts']!.getPost = remote.get([localMw], async () => {
      log.push('handler')
      return 'ok'
    })

    const adapter = createFetchAdapter({
      manifest: buildManifest(),
      load: async (modulePath) => modules[modulePath]!,
      middlewares: [globalMw],
    })

    const response1 = await adapter(makeRpcRequest({ key: 'posts.getPost', args: [], routePath: '/posts/42' }))
    expect(response1?.status).toBe(200)
    expect(log).toEqual(['global-before', 'local', 'handler', 'global-after'])

    log.length = 0
    const response2 = await adapter(makeRpcRequest({ key: 'index.greet', args: ['world'], routePath: '/' }))
    expect(response2?.status).toBe(200)
    expect(log).toEqual(['global-before', 'global-after'])
  })
})

describe('extractRouteParams', () => {
  it('returns empty params for empty patterns', () => {
    expect(extractRouteParams('', '/anything', [])).toEqual({})
  })

  it('extracts single dynamic params', () => {
    expect(extractRouteParams('/posts/:id', '/posts/42', ['id'])).toEqual({ id: '42' })
  })

  it('extracts multiple dynamic params', () => {
    expect(extractRouteParams('/posts/:category/:id', '/posts/tech/42', ['category', 'id'])).toEqual({
      category: 'tech',
      id: '42',
    })
  })

  it('extracts catch-all slug arrays', () => {
    expect(extractRouteParams('/docs/*', '/docs/a/b/c', ['slug'])).toEqual({ slug: ['a', 'b', 'c'] })
  })

  it('returns null when path does not match pattern', () => {
    expect(extractRouteParams('/posts/:id', '/users/42', ['id'])).toBeNull()
  })

  it('ignores query strings', () => {
    expect(extractRouteParams('/posts/:id', '/posts/42?foo=bar', ['id'])).toEqual({ id: '42' })
  })
})
