import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { auwlaRouter } from '../../src/vite-router/router-plugin'

const tempDirs: string[] = []

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'auwla-hmr-'))
  tempDirs.push(root)
  const pagesDir = join(root, 'src/pages')
  const serverDir = join(root, 'src/server')
  mkdirSync(pagesDir, { recursive: true })
  mkdirSync(serverDir, { recursive: true })
  writeFileSync(join(pagesDir, 'index.tsx'), 'export default function Home() { return <h1>Home</h1> }')

  const plugin = auwlaRouter() as any
  plugin.configResolved({
    root,
    build: { ssr: false, outDir: 'dist' },
  })
  plugin.buildStart.call({})

  return { root, pagesDir, serverDir, plugin }
}

function runHotUpdate(
  plugin: any,
  file: string,
  modules: any[],
  virtualModules: Record<string, any>,
  type: 'create' | 'update' | 'delete' = 'update',
) {
  const environment = {
    name: 'client',
    moduleGraph: {
      getModuleById(id: string) {
        return virtualModules[id]
      },
    },
    hot: { send() {} },
  }

  return plugin.hotUpdate.call(
    { environment },
    {
      type,
      file,
      timestamp: Date.now(),
      modules,
      read: () => '',
      server: {},
    },
  )
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('auwla router Vite 8 hot updates', () => {
  it('returns changed pages and generated modules to the environment pipeline', () => {
    const { pagesDir, plugin } = createFixture()
    const page = { id: join(pagesDir, 'index.tsx') }
    const routes = { id: '\0auwla:routes' }
    const islands = { id: '\0auwla:islands' }

    const result = runHotUpdate(plugin, page.id, [page], {
      '\0auwla:routes': routes,
      '\0auwla:islands': islands,
    })

    expect(result).toEqual([page, routes, islands])
  })

  it('propagates virtual route updates when a page is created or deleted', () => {
    const { pagesDir, plugin } = createFixture()
    const routes = { id: '\0auwla:routes' }
    const islands = { id: '\0auwla:islands' }
    const page = join(pagesDir, 'about.tsx')
    writeFileSync(page, 'export default function About() { return <h1>About</h1> }')

    const created = runHotUpdate(plugin, page, [], {
      '\0auwla:routes': routes,
      '\0auwla:islands': islands,
    }, 'create')
    rmSync(page)
    const deleted = runHotUpdate(plugin, page, [], {
      '\0auwla:routes': routes,
      '\0auwla:islands': islands,
    }, 'delete')

    expect(created).toEqual([routes, islands])
    expect(deleted).toEqual([routes, islands])
  })

  it('propagates regenerated server manifests after a server module is deleted', () => {
    const { serverDir, plugin } = createFixture()
    const serverFile = join(serverDir, 'posts.server.ts')
    const manifest = { id: '\0auwla:server-manifest' }

    const result = runHotUpdate(plugin, serverFile, [], {
      '\0auwla:server-manifest': manifest,
    }, 'delete')

    expect(result).toEqual([manifest])
  })
})
