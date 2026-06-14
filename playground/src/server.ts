import { createFetchAdapter } from 'auwla/adapters/fetch'
import manifest from './.auwla/server-manifest.js'

const port = Number(process.env.PORT ?? 3000)
const rpc = createFetchAdapter({ manifest })

Bun.serve({
  fetch: async (request) => {
    // 1. RPC endpoint
    const rpcResponse = await rpc(request)
    if (rpcResponse) return rpcResponse

    // 2. Static files from the production build
    const url = new URL(request.url)
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname
    const file = Bun.file(`./dist${pathname}`)
    const exists = await file.exists()
    if (exists) return new Response(file)

    return new Response('Not found', { status: 404 })
  },
  port,
})

console.log(`[server] running at http://localhost:${port}`)
