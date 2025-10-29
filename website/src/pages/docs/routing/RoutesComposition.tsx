import { h } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsRoutesComposition() {
  return (
    <section class="docs-prose">
      <h1>Routing: Route Composition</h1>
      <p>
        This guide breaks down routes step-by-step for junior developers: what a route is, how
        <code>defineRoutes()</code> keeps types accurate, how <code>group()</code> applies a shared
        <code>layout</code> and <code>guard</code>, why <code>composeRoutes()</code> matters, and how to build
        URLs safely with <code>pathFor()</code>.
      </p>

      <h2>What Is a Route?</h2>
      <p>
        A route maps a URL to a component function. When the browser path matches the route’s <code>path</code>,
        the router calls the route’s <code>component(params, query)</code> and renders what it returns.
      </p>
      <CodeBlock language="ts" filename="RouteShape.ts" code={`type Route<P extends string | RegExp = string> = {
  path: P
  component: (
    params?: P extends string ? PathParams<P> : Record<string,string>,
    query?: Record<string,string>
  ) => HTMLElement
  name?: string
  guard?: (to: RouteMatch, from: RouteMatch | null) => boolean | Promise<boolean>
  layout?: (
    child: HTMLElement,
    params?: Record<string, string>,
    query?: Record<string, string>
  ) => HTMLElement
  routed?: (
    state: Record<string, any>,
    params?: Record<string, string>,
    prev?: RouteMatch | null
  ) => void | (() => void)
}
`} />

      <h2>defineRoutes(): Keep Types Accurate</h2>
      <p>
        Use <code>defineRoutes([...])</code> to declare routes. It preserves literal path types (including
        <code>:params</code>) so your component receives the right <code>params</code> shape.
      </p>
      <CodeBlock language="tsx" filename="routes/users.tsx" code={`import { h, defineRoutes } from 'auwla'

function UsersIndex() { return <section><h1>Users</h1></section> as HTMLElement }
function UserDetail(params?: { id: string }) { return <section><h1>User {params!.id}</h1></section> as HTMLElement }

export const userRoutes = defineRoutes([
  { path: '/users', component: UsersIndex, name: 'users' },
  { path: '/users/:id', component: UserDetail, name: 'user-detail' },
])
`} />

      <h2>group(): Shared Base, Layout, and Guard</h2>
      <p>
        <code>group(base, options, routes)</code> prefixes each child <code>path</code> with <code>base</code>
        and applies a shared <code>layout</code> (wrapper around each rendered component) and/or <code>guard</code>
        (a function that decides if navigation is allowed).
      </p>

      <h3>Use JSX for Layouts</h3>
      <p>Layouts should be written in JSX — no manual DOM manipulation needed.</p>
      <CodeBlock language="tsx" filename="layouts/AppShell.tsx" code={`import { h } from 'auwla'

export function AppShell(child: HTMLElement) {
  return (
    <div class="grid grid-cols-[240px_1fr] min-h-screen">
      <aside>Nav</aside>
      <main>{child}</main>
    </div>
  ) as HTMLElement
}
`} />

      <h3>Small Demo: Guard + Layout</h3>
      <p>
        The guard runs before render. If it returns/resolves <code>false</code>, the router blocks navigation
        and reverts to the previous path. The layout wraps the component for every route in the group.
      </p>
      <CodeBlock language="tsx" filename="routes/admin.tsx" code={`import { h, defineRoutes, group } from 'auwla'
import type { RouteGuard } from 'auwla'
import { AppShell } from '../layouts/AppShell'

// Simple guard: only allow access when a flag is set
const isAdminGuard: RouteGuard = (to, from) => {
  return window.sessionStorage.getItem('role') === 'admin'
}

// Define admin pages relative to the group base
const adminPages = defineRoutes([
  { path: '/', component: () => <section><h1>Admin Home</h1></section> },
  { path: '/users', component: () => <section><h1>Manage Users</h1></section> },
])

// Group under /admin with shared layout and guard
export const adminRoutes = group('/admin', { layout: AppShell, guard: isAdminGuard }, adminPages)
`} />

      <h2>composeRoutes(): Keep Features Modular</h2>
      <p>
        <code>composeRoutes(...lists)</code> concatenates route arrays. This keeps each feature area independent
        while producing a single array for the router. Order matters: earlier routes match first.
      </p>
      <CodeBlock language="ts" filename="routes/index.ts" code={`import { composeRoutes } from 'auwla'
import { userRoutes } from './users'
import { adminRoutes } from './admin'
import { marketingRoutes } from './marketing'

// Produce one array for the router; earlier entries match first
export default composeRoutes(marketingRoutes, userRoutes, adminRoutes)
`} />

      <h2>pathFor(): Build URLs Safely</h2>
      <p>
        <code>pathFor(pattern, params, query)</code> replaces <code>:params</code>, URL-encodes values, and
        appends a query string when provided.
      </p>
      <CodeBlock language="ts" filename="routes/pathFor.ts" code={`import { pathFor } from 'auwla'

const user42 = pathFor('/users/:id', { id: 42 }) // "/users/42"
const search = pathFor('/search', {}, { q: 'laptop', page: 2 }) // "/search?q=laptop&page=2"
`} />

      <h2>Putting It Together</h2>
      <p>
        Define local routes per feature, group related pages under base paths with guards/layouts, and compose
        everything into the final list used by the router.
      </p>
      <CodeBlock language="tsx" filename="routes/app.tsx" code={`import { h, defineRoutes, group, composeRoutes } from 'auwla'
import { AppShell } from './layouts/AppShell'

// Public
const publicPages = defineRoutes([
  { path: '/', component: () => <section><h1>Home</h1></section> },
  { path: '/about', component: () => <section><h1>About</h1></section> },
])

// Admin (wrapped with AppShell, protected by isAdminGuard)
const adminPages = defineRoutes([
  { path: '/', component: () => <section><h1>Admin Home</h1></section> },
  { path: '/users', component: () => <section><h1>Manage Users</h1></section> },
])

const isAdminGuard = () => window.sessionStorage.getItem('role') === 'admin'

export const routes = composeRoutes(
  publicPages,
  group('/admin', { layout: AppShell, guard: isAdminGuard }, adminPages),
)
`} />

      <h2>Tips for Beginners</h2>
      <ul>
        <li>Start by listing pages with <code>defineRoutes()</code>. Test them without guards/layouts first.</li>
        <li>Use <code>group()</code> when pages share a base path and should use the same shell or protection.</li>
        <li>
          Place broader routes earlier when composing; order matters because routes are matched in sequence.
        </li>
        <li>Use <code>pathFor()</code> whenever you build URLs with params or query; avoid string concat.</li>
      </ul>

      <p>
        Continue to <a href="/docs/routing/">Routing → Introduction</a> to learn about the <code>Link</code>
        component and active-state behavior.
      </p>
    </section>
  ) as HTMLElement
}