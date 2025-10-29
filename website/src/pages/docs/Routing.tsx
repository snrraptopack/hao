import { h, Link } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsRouting() {
  return (
    <section class="docs-prose">
      <h1>Routing</h1>
      <p>
        Auwla’s router organizes pages and updates the DOM when the URL changes. This page starts with the
        <code>Link</code> component — the user‑facing way to navigate — then dives into how to compose routes
        with <code>defineRoutes()</code>, <code>group()</code>, and <code>composeRoutes()</code>.
      </p>

      <h2>Introduction: Link</h2>
      <p>
        <code>Link</code> renders an anchor that builds its <code>href</code> from a path plus optional
        <code>params</code> and <code>query</code>, computes an active state by watching the current route,
        and intercepts clicks to call <code>router.push()</code>.
      </p>
      <CodeBlock language="tsx" filename="BasicLink.tsx" code={`import { h, Link } from 'auwla'

export function Nav() {
  return (
    <nav class="flex gap-2">
      <Link to="/docs" text="Docs" className="px-3 py-1 rounded hover:bg-gray-100" activeClassName="bg-gray-50 font-medium" />
      <Link to="/docs/routing" text="Routing" className="px-3 py-1 rounded hover:bg-gray-100" activeClassName="bg-indigo-50 text-indigo-700" />
    </nav>
  ) as HTMLElement
}
`} />

      <h3>Link API</h3>
      <p>The <code>Link</code> props are simple and predictable:</p>
      <CodeBlock language="ts" filename="LinkProps.ts" code={`type LinkProps = {
  to: string;
  params?: Record<string, string | number>;
  query?: Record<string, string | number>;
  text: string | Ref<string>;
  className?: string | Ref<string>;
  activeClassName?: string;
}
`} />
      <ul>
        <li><code>to</code>: target path (may include <code>:params</code> segments).</li>
        <li><code>params</code>: values to replace named segments (e.g. <code>{'{ id: 42 }'}</code> for <code>/users/:id</code>).</li>
        <li><code>query</code>: key/value pairs serialized into the query string.</li>
        <li><code>text</code>: link text; accepts a string or a reactive <code>Ref&lt;string&gt;</code>.</li>
        <li><code>className</code>: base classes for styling (string or reactive <code>Ref</code>).</li>
        <li><code>activeClassName</code>: classes appended when the link matches the current path.</li>
      </ul>

      <h3>How it works</h3>
      <ul>
        <li><b>Href building</b>: replaces <code>:param</code> segments and serializes <code>query</code> to <code>?key=value</code>.</li>
        <li><b>Active state</b>: watches <code>router.currentPath</code> and compares it to the link’s <code>href</code> (without query).</li>
        <li><b>Navigation</b>: prevents default and calls <code>router.push(href)</code> so the router renders the new page.</li>
      </ul>

      <h2>Routes Composition</h2>
      <p>
        Routes are plain objects with a <code>path</code> and <code>component</code>. Use
        <code>defineRoutes()</code> to declare a typed list, <code>group()</code> to nest under a base path and
        optionally apply a shared <code>layout</code> or <code>guard</code>, and <code>composeRoutes()</code> to
        merge multiple lists.
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

      <h3>Define a route list</h3>
      <p>
        <code>defineRoutes()</code> preserves literal path types (including <code>:params</code>) so your
        <code>component</code> signatures stay accurate.
      </p>
      <CodeBlock language="tsx" filename="routes/users.tsx" code={`import { h, defineRoutes } from 'auwla'

function UsersIndex() { return <section><h1>Users</h1></section> as HTMLElement }
function UserDetail(params?: { id: string }) { return <section><h1>User {params!.id}</h1></section> as HTMLElement }

export const userRoutes = defineRoutes([
  { path: '/users', component: UsersIndex, name: 'users' },
  { path: '/users/:id', component: UserDetail, name: 'user-detail' },
])
`} />

      <h3>Group under a base path</h3>
      <p>
        <code>group(base, options, routes)</code> prefixes each <code>path</code> with <code>base</code> and applies
        shared <code>layout</code> and/or <code>guard</code>.
      </p>
      <CodeBlock language="tsx" filename="routes/admin.tsx" code={`import { h, group, defineRoutes } from 'auwla'

function AdminLayout(child: HTMLElement) {
  return (<div class="admin-shell"><aside>Admin</aside><main>{child}</main></div>) as HTMLElement
}

const adminPages = defineRoutes([
  { path: '/', component: () => <section><h1>Admin Home</h1></section> },
  { path: '/users', component: () => <section><h1>Manage Users</h1></section> },
])

export const adminRoutes = group('/admin', { layout: AdminLayout }, adminPages)
`} />

      <h3>Compose multiple lists</h3>
      <p>
        <code>composeRoutes(...lists)</code> concatenates route arrays. This keeps features modular while producing
        a single list for the router.
      </p>
      <CodeBlock language="ts" filename="routes/index.ts" code={`import { composeRoutes } from 'auwla'
import { userRoutes } from './users'
import { adminRoutes } from './admin'

export default composeRoutes(userRoutes, adminRoutes)
`} />

      <h3>Build paths safely</h3>
      <p>
        Use <code>pathFor(pattern, params, query)</code> to construct URLs. This avoids manual string concatenation
        and keeps params encoded.
      </p>
      <CodeBlock language="ts" filename="routes/pathFor.ts" code={`import { pathFor } from 'auwla'

const user42 = pathFor('/users/:id', { id: 42 }) // "/users/42"
const search = pathFor('/search', {}, { q: 'laptop', page: 2 }) // "/search?q=laptop&page=2"
`} />

      <p>
        Next: explore <Link to="/docs/reactivity/" text="Reactivity" /> to see how state updates and navigation
        integrate in components.
      </p>
    </section>
  ) as HTMLElement
}