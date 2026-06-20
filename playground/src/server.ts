import { createBunAdapter } from 'auwla/adapters/bun'

const port = Number(process.env.PORT ?? 0)

const auwlaRequest = createBunAdapter()

const server = {
  port,
  fetch: createBunAdapter()
}

export default server
