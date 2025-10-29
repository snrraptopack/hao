import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsParamsAndQuery() {
  return (
    <section class="docs-prose">
      <h1>Routing: Params &amp; Query</h1>
      <p>
        There are three common ways to work with dynamic <code>params</code> and URL <code>query</code> in Auwla:
      </p>
      <ul>
        <li>Pass them as props from the route component factory.</li>
        <li>Read them via hooks: <code>useParams()</code> and <code>useQuery()</code>.</li>
        <li>React to them using the component lifecycle hook <code>onRouted</code>.</li>
      </ul>

      <h2>1) Pass as Props (Route Component Args)</h2>
      <p>
        Every route’s <code>component</code> is called with <code>(params, query)</code>. In JSX, you can pass
        those values down as props to your page component for clear, explicit data flow.
      </p>
      <CodeBlock language="tsx" filename="RouteProps.tsx" code={`import { h } from 'auwla'
import { defineRoutes } from 'auwla'

// Page component accepts explicit props
function UserDetail({ id, tab }: { id: string; tab?: string }) {
  return (
    <section>
      <h2>User {id}</h2>
      {tab ? <p>Showing tab: {tab}</p> : null}
    </section>
  ) as HTMLElement
}

// Route component receives (params, query) and passes them as props
export const routes = defineRoutes([
  {
    path: '/users/:id',
    component: (params, query) => <UserDetail id={params!.id} tab={query?.tab} />,
  },
])
`} />
      <ul>
        <li>
          Typed params are inferred from the pattern (e.g. <code>':id'</code> becomes <code>{'{ id: string }'}</code>).
        </li>
        <li>
          Query values are <code>string</code> by default; coerce to numbers/booleans in your component if needed.
        </li>
      </ul>

      <h2>2) Read with Hooks</h2>
      <p>
        For components that live directly under a route, reading <code>params</code>/<code>query</code> via hooks is
        straightforward. Both hooks return a reactive <code>Ref&lt;Record&lt;string, string&gt;&gt;</code>.
      </p>
      <CodeBlock language="tsx" filename="HooksExample.tsx" code={`import { h, useParams, useQuery } from 'auwla'

export function UserDetail() {
  const params = useParams() // Ref<{ id: string }>
  const query = useQuery()   // Ref<Record<string, string>>

  return (
    <section>
      <h2>User {params.value.id}</h2>
      {query.value.tab ? <p>Showing tab: {query.value.tab}</p> : null}
    </section>
  ) as HTMLElement
}
`} />
      <ul>
        <li>
          Hooks are ideal when the component directly depends on the current route and you prefer
          not to thread props manually.
        </li>
        <li>
          Access values via <code>.value</code>; derive additional refs using <code>watch</code> if needed.
        </li>
      </ul>

      <h2>3) Use the onRouted Lifecycle Hook</h2>
      <p>
        <code>onRouted</code> runs after the component mounts and provides a full <code>RoutedContext</code>:
        <code>params</code>, <code>query</code>, <code>path</code>, <code>prev</code> match, the <code>router</code>, and a 
        shared router <code>state</code> object for caching. It’s perfect for reacting to route changes and
        performing effects that should be scoped to the current route.
      </p>
      <CodeBlock language="tsx" filename="OnRouted.tsx" code={`import { h } from 'auwla'
import { onRouted } from 'auwla'

export function UserDetail() {
  onRouted((ctx) => {
    // Read params/query safely
    const id = ctx.params.id
    const tab = ctx.query.tab

    // Cache or reuse data on the router state
    if (!ctx.state.user || ctx.state.user.id !== id) {
      // fetchUser returns a promise; you can manage it here
      // ctx.state.user = await fetchUser(id)
    }

    // Optional cleanup: return a function to run when the route changes
    return () => {
      // e.g. abort fetch, clear timeouts, or reset route-scoped cache
      // delete ctx.state.user
    }
  })

  return <section><h2>User Detail</h2></section> as HTMLElement
}
`} />
      <ul>
        <li>
          Import <code>onRouted</code> from <code>'auwla'</code>. It runs after mount; cleanup is automatic.
        </li>
        <li>
          Prefer <code>onRouted</code> for component-local effects. Use route-level <code>routed</code> when you need
          to run logic before rendering and optionally provide global cleanup for the route.
        </li>
      </ul>

      <h2>Route-Level routed (Optional)</h2>
      <p>
        In addition to <code>onRouted</code>, a route can define a <code>routed(state, params, prev)</code> callback
        that runs before the component is created. Use it to prepare data or mutate shared router state.
      </p>
      <CodeBlock language="ts" filename="RouteRouted.ts" code={`import { defineRoutes } from 'auwla'

export const routes = defineRoutes([
  {
    path: '/users/:id',
    routed: (state, params, prev) => {
      // Prepare or cache by id; return cleanup if needed
      const id = params!.id
      if (!state.user || state.user.id !== id) {
        // state.user = await fetchUser(id)
      }
      return () => {
        // delete state.user
      }
    },
    component: (params, query) => /* ... */ document.createElement('div'),
  },
])
`} />

      <h2>Choosing an Approach</h2>
      <ul>
        <li>
          Props: explicit and testable; great for clear interfaces and composition.
        </li>
        <li>
          Hooks: simplest when a component reads from the current route directly.
        </li>
        <li>
          onRouted: ideal for side-effects, caching, and reacting to route changes.
        </li>
      </ul>

      <p>
        See also <Link to="/docs/routing/" text="Routing: Introduction" /> and{' '}
        <Link to="/docs/routing/composition" text="Route Composition" />.
      </p>
    </section>
  ) as HTMLElement
}