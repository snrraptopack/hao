import { Hono } from 'hono'
import { createHonoAdapter } from 'auwla/adapters/hono'

const port = Number(process.env.PORT ?? 3000)

const app = new Hono()

/**
 * Serve built static assets from dist/assets/*.
 * The HTML references these as /assets/*, so we mount serveStatic
 * at /assets/* with the dist directory as the root.
 * serveStatic will resolve: /assets/foo.js → dist/assets/foo.js
 */
// Only load and mount the Bun static file server if running in Bun
if (typeof Bun !== 'undefined') {
  const { serveStatic } = await import('hono/bun')
  app.use('/assets/*', serveStatic({ root: './dist' }))
}

// Auwla middleware: handles RPC routes + SSR page rendering
app.use('*', createHonoAdapter())

export default {
  port,
  fetch: app.fetch,
}
