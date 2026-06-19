import { createBunAdapter } from 'auwla/adapters/bun'

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: createBunAdapter()
}

// Optional: for running this file directly in production
if (import.meta.main) {
  // @ts-ignore
  Bun.serve(module.exports.default)
  console.log(`[server] running at http://localhost:${port}`)
}
