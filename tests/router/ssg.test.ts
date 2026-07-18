import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { auwlaRouter } from '../../src/vite-router/router-plugin'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import * as fs from 'node:fs'

vi.mock('vite', () => {
  return {
    createServer: vi.fn().mockImplementation(() => {
      return {
        ssrLoadModule: vi.fn().mockImplementation((id) => {
          if (id === 'auwla:routes') {
            return {
              default: [
                {
                  path: '/',
                  config: { renderMode: 'ssg' },
                  component: () => '<div>Home</div>'
                },
                {
                  path: '/posts/:id',
                  config: {
                    renderMode: 'ssg',
                    generatePaths: async () => [{ id: '1' }, { id: '2' }]
                  },
                  component: () => '<div>Post</div>'
                },
                {
                  path: '/about',
                  config: { renderMode: 'spa' },
                  component: () => '<div>About</div>'
                }
              ]
            }
          }
          if (id === 'auwla/runtime/ssr') {
            return {
              renderToString: vi.fn().mockImplementation((url) => {
                const pathname = new URL(url).pathname
                return { html: `<div>Rendered ${pathname}</div>` }
              })
            }
          }
          return {}
        }),
        close: vi.fn()
      }
    })
  }
})

describe('SSG closeBundle hook', () => {
  let tempDir: string
  let outDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), `auwla-ssg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    outDir = join(tempDir, 'dist')
    fs.mkdirSync(outDir, { recursive: true })
    
    // Write a dummy index.html template
    fs.writeFileSync(
      join(outDir, 'index.html'),
      '<html><body><div id="app"><!--app-html--></div></body></html>',
      'utf-8'
    )
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('runs build-time static site generation and writes static files', async () => {
    const plugin: any = auwlaRouter()

    // 1. Resolve config
    plugin.configResolved({
      root: tempDir,
      build: {
        outDir: 'dist',
        ssr: false
      }
    })

    // 2. Call closeBundle
    await plugin.closeBundle()

    // 3. Assert index.html is generated for root path
    const homeHtmlPath = join(outDir, 'index.html')
    const homeHtml = fs.readFileSync(homeHtmlPath, 'utf-8')
    expect(homeHtml).toContain('data-auwla-ssr="true"')
    expect(homeHtml).toContain('Rendered /')

    // 4. Assert index.html is generated for dynamic paths under posts/1 and posts/2
    const post1Path = join(outDir, 'posts', '1', 'index.html')
    const post2Path = join(outDir, 'posts', '2', 'index.html')

    expect(fs.existsSync(post1Path)).toBe(true)
    expect(fs.existsSync(post2Path)).toBe(true)

    const post1Html = fs.readFileSync(post1Path, 'utf-8')
    expect(post1Html).toContain('Rendered /posts/1')

    const post2Html = fs.readFileSync(post2Path, 'utf-8')
    expect(post2Html).toContain('Rendered /posts/2')

    // 5. Assert SPA page (/about) is NOT generated
    const aboutPath = join(outDir, 'about', 'index.html')
    expect(fs.existsSync(aboutPath)).toBe(false)
  })
})
