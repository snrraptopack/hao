import { describe, expect, it, vi } from 'vitest'
import { createDevServerMiddleware } from '../../src/dev-middleware'

function createServer(fetchHandler = vi.fn()) {
  return {
    ssrLoadModule: vi.fn().mockResolvedValue({ default: fetchHandler }),
    transformRequest: vi.fn(),
    transformIndexHtml: vi.fn(async (_url: string, html: string) => html),
    moduleGraph: { getModuleByUrl: vi.fn() },
    ssrFixStacktrace: vi.fn(),
  } as any
}

function createResponse() {
  return {
    statusCode: 0,
    statusMessage: '',
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  } as any
}

describe('Auwla Vite dev middleware', () => {
  it.each([
    '/src/main.tsx',
    '/src/pages/index.tsx?t=1234',
    '/src/styles.css?direct',
    '/@vite/client',
    '/@id/__x00__auwla:routes',
    '/node_modules/.vite/deps/hono.js?v=1234',
    '/shared/component.ts?import',
    '/assets/logo.svg',
  ])('passes Vite-owned request %s to the next middleware', async (url) => {
    const server = createServer()
    const middleware = await createDevServerMiddleware(server, './src/server.ts')
    const next = vi.fn()

    await middleware({ url }, createResponse(), next)

    expect(next).toHaveBeenCalledOnce()
    expect(server.ssrLoadModule).not.toHaveBeenCalled()
  })

  it('continues to render application routes through the server entry', async () => {
    const fetchHandler = vi.fn().mockResolvedValue(new Response('<h1>Fresh page</h1>', {
      headers: { 'content-type': 'text/html' },
    }))
    const server = createServer(fetchHandler)
    const middleware = await createDevServerMiddleware(server, './src/server.ts')
    const response = createResponse()
    const next = vi.fn()

    await middleware({
      url: '/',
      method: 'GET',
      headers: { host: 'localhost:5174' },
    }, response, next)

    expect(server.ssrLoadModule).toHaveBeenCalledWith('./src/server.ts')
    expect(fetchHandler).toHaveBeenCalledOnce()
    expect(response.end).toHaveBeenCalledWith('<h1>Fresh page</h1>')
    expect(next).not.toHaveBeenCalled()
  })
})
