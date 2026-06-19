import { createBunAdapter } from 'auwla/adapters/bun'

const port = Number(process.env.PORT ?? 3000)

import { readFileSync } from 'fs'
import { join } from 'path'

let manifest;
try {
  const manifestPath = join(process.cwd(), '.auwla/server-manifest.json');
  manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
} catch (e) {
  console.log("No manifest found, RPCs might fail.");
}

import routes from 'auwla:routes'

Bun.serve({
  fetch: createBunAdapter({ manifest, routes }),
  port,
})

console.log(`[server] running at http://localhost:${port}`)
