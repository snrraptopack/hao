import { h } from 'auwla'

export function DocsPluginSystem() {
  return (
    <section class="docs-prose">
      <h1>Plugin System</h1>
      <p>Auwla plugins provide composable, type‑safe context to pages and layouts. They are the foundation for fullstack, auth, i18n and other integrations.</p>

      <h2>Defining a Plugin</h2>
      <pre><code>{`import { definePlugin, ref } from 'auwla'

export const authPlugin = () => definePlugin(() => {
  const user = ref(null)
  async function login(email, pass) { /* ... */ }
  function logout() { user.value = null }
  return { auth: { user, login, logout } }
})`}</code></pre>

      <h2>Using Plugins in Pages</h2>
      <pre><code>{`import { definePage, plugins } from 'auwla'
import { authPlugin } from './plugins/auth'

export const Page = definePage(
  (ctx) => {
    ctx.auth.login('email', 'pass')
    return <div>{ctx.auth.user.value?.name}</div>
  },
  plugins(authPlugin())
)`}</code></pre>

      <h2>Layouts and Context Inheritance</h2>
      <pre><code>{`import { defineLayout } from 'auwla'
import { authPlugin } from './plugins/auth'
import { fullstackPlugin } from './plugins/fullstack'

const layout = defineLayout(
  (ctx, child) => <section>{child}</section>,
  [authPlugin(), fullstackPlugin($api)] as const
)

export const Page = layout.definePage((ctx) => {
  ctx.$api.user.get({ id: '1' })
  return <div/>
})`}</code></pre>

      <h2>How It Works</h2>
      <ul class="list-disc pl-6">
        <li><strong>Creation</strong>: `definePlugin` returns a function that, when executed, produces a context object.</li>
        <li><strong>Composition</strong>: `plugins(...)` creates a typed tuple; `createPluginContext` executes and merges results (`src/plugin.ts:163–181`).</li>
        <li><strong>Stack</strong>: Layouts push their context (`pushPluginContext`), pages read merged context with `getPluginContext` (`src/plugin.ts:109–143`).</li>
        <li><strong>Type Safety</strong>: `InferPlugins` computes merged types for autocompletion (`src/plugin.ts:69–86`).</li>
      </ul>

      <h2>Best Practices</h2>
      <ul class="list-disc pl-6">
        <li>Expose stable APIs from plugins: refs for state, functions for actions.</li>
        <li>Keep side effects inside pages/components; plugins provide facilities.</li>
        <li>Reuse plugin instances via layout to share state across child pages.</li>
      </ul>

      <h2>Examples</h2>
      <ul class="list-disc pl-6">
        <li>Auth: user session handling.</li>
        <li>Fullstack: typed API client via bridge.</li>
        <li>i18n: locale and translation management.</li>
      </ul>
    </section>
  ) as HTMLElement
}

