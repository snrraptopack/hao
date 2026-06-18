import { createSsrAdapter } from 'auwla/ssr'
import manifest from '../.auwla/server-manifest.js'
import App from './app.js'

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  fetch: createSsrAdapter({
    manifest,
    ssr: { app: App, staticDir: './dist' },
  }),
  port,
})

console.log(`[server] running at http://localhost:${port}`)
