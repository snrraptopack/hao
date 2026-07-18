/** @jsxImportSource auwla */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoApp, h } from '../../src'
import { compileAuwla, evaluateCompiled } from '../compiler/_helpers'

let routerMod: Awaited<ReturnType<typeof importRouter>>
async function importRouter() { return import('../../src/router/index') }

describe('compiled layout chain transitions', () => {
  beforeEach(async () => {
    // @ts-expect-error force History fallback
    delete (window as any).navigation
    vi.stubGlobal('scrollTo', vi.fn())
    history.replaceState(null, '', '/')
    if (!routerMod) routerMod = await importRouter()
    else { routerMod.resetRoutes(); routerMod.navigate('/', { replace: true }) }
  })

  it('navigates between compiled-layout routes repeatedly without DOM errors', async () => {
    const shellSrc = `
      export function Shell(child) {
        let open = false
        return () => (
          <div class="shell">
            <nav><button onClick={() => { open = !open }}>menu {open ? 'on' : 'off'}</button></nav>
            <main>{h(child, {})}</main>
          </div>
        )
      }
      export function DocsShell(child) {
        return () => (
          <div class="docs-shell">
            <aside><ul><li>a</li><li>b</li></ul></aside>
            <section>{h(child, {})}</section>
          </div>
        )
      }
    `
    const { Shell, DocsShell } = evaluateCompiled(compileAuwla(shellSrc)) as any

    const { Router, navigate, defineRoutes } = routerMod
    const root = document.createElement('div')
    document.body.appendChild(root)

    function Home() { return () => <p>home page</p> }
    function DocA() { return () => <p>doc A</p> }
    function DocB() { return () => <p>doc B</p> }

    const routes = defineRoutes([
      { path: '/', component: Home, layouts: [Shell] },
      { path: '/docs/a', component: DocA, layouts: [Shell, DocsShell] },
      { path: '/docs/b', component: DocB, layouts: [Shell, DocsShell] },
    ])
    function App() { return () => <Router routes={routes} /> }

    const app = createMemoApp(root, h(App as any))
    try {
      navigate('/')
      await new Promise<void>((r) => queueMicrotask(r))
      expect(root.textContent).toContain('home page')

      navigate('/docs/a')
      await new Promise<void>((r) => queueMicrotask(r))
      await new Promise<void>((r) => queueMicrotask(r))
      expect(root.textContent).toContain('doc A')

      navigate('/docs/b')
      await new Promise<void>((r) => queueMicrotask(r))
      await new Promise<void>((r) => queueMicrotask(r))
      expect(root.textContent).toContain('doc B')

      navigate('/docs/a')
      await new Promise<void>((r) => queueMicrotask(r))
      await new Promise<void>((r) => queueMicrotask(r))
      expect(root.textContent).toContain('doc A')
    } finally {
      app.destroy()
      root.remove()
    }
  })
})
