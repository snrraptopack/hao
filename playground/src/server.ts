import { createBunAdapter } from 'auwla/adapters/bun'
import manifest from './.auwla/server-manifest.js'

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  fetch: createBunAdapter({ manifest }),
  port,
})

console.log(`[server] running at http://localhost:${port}`)

