import { h, Link } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsLifecycleAndDataFetching() {
  return (
    <section class="docs-prose">
      <h1>Lifecycle &amp; Data Fetching</h1>
      <p>
        Learn how to run effects when a component mounts/unmounts, react to route changes, and fetch
        data with simple reactive helpers. This page covers <code>onMount</code>, <code>onUnmount</code>,
        <code>onRouted</code>, <code>fetch()</code>, and <code>asyncOp()</code>.
      </p>

      <h2>Lifecycle Basics</h2>
      <p>
        Use <code>onMount</code> for setup (subscriptions, timers, initial effects) and
        <code>onUnmount</code> for cleanup.
      </p>
      <CodeBlock language="tsx" filename="LifecycleBasics.tsx" code={`import { h } from 'auwla'
import { onMount, onUnmount } from 'auwla'

export function Clock() {
  onMount(() => {
    const id = setInterval(() => console.log('tick'), 1000)
    return () => clearInterval(id) // cleanup runs on unmount
  })

  onUnmount(() => {
    console.log('Clock component unmounted')
  })

  return <div>Clock running…</div> as HTMLElement
}
`} />

      <h2>Route-Aware Lifecycle: onRouted</h2>
      <p>
        <code>onRouted</code> runs after mount with a <code>RoutedContext</code> containing
        <code>params</code>, <code>query</code>, <code>path</code>, <code>prev</code> match, the <code>router</code>,
        and shared router <code>state</code>. It’s ideal for reacting to navigation and caching.
      </p>
      <CodeBlock language="tsx" filename="OnRoutedExample.tsx" code={`import { h } from 'auwla'
import { onRouted } from 'auwla'

export function UserPage() {
  onRouted((ctx) => {
    const id = ctx.params.id
    // Cache fetched user by id on the router state
    if (!ctx.state.user || ctx.state.user.id !== id) {
      // ctx.state.user = await fetchUser(id)
    }
    // Optional cleanup when route changes
    return () => {
      // delete ctx.state.user
    }
  })
  return <section><h2>User</h2></section> as HTMLElement
}
`} />

      <h2>Data Fetching: fetch()</h2>
      <p>
        <code>fetch&lt;T&gt;(url, { '{ cacheKey?: string }' })</code> returns <code>{'{ data, loading, error, refetch }'}</code>.
        It auto-runs on mount and can cache results in the router state with <code>cacheKey</code>.
      </p>
      <CodeBlock language="tsx" filename="FetchUsers.tsx" code={`import { h } from 'auwla'
import { fetch, When } from 'auwla'

type User = { id: number; name: string }

export function UsersList() {
  const { data, loading, error, refetch } = fetch<User[]>('/api/users', { cacheKey: 'users' })

  return (
    <section>
      <h2>Users</h2>
      <When>
        {loading}
        {() => <div>Loading…</div>}
        {error}
        {() => <div className="text-red-600">Error: {error.value}</div>}
        {() => (
          <ul>
            {(data.value || []).map(u => <li>{u.name}</li>)}
          </ul>
        )}
      </When>
      <button onClick={() => refetch()}>Refresh</button>
    </section>
  ) as HTMLElement
}
`} />

      <h3>Param-Driven Fetch</h3>
      <p>
        Pass a function to <code>fetch</code> to build a URL from current refs. Use <code>onRouted</code> to
        refetch when the route parameters change.
      </p>
      <CodeBlock language="tsx" filename="FetchByParam.tsx" code={`import { h } from 'auwla'
import { useParams } from 'auwla'
import { onRouted, fetch, When } from 'auwla'

type User = { id: number; name: string }

export function UserDetail() {
  const params = useParams() // Ref<{ id: string }>

  const { data, loading, error, refetch } = fetch<User>(() => '/api/users/' + params.value.id, {
    cacheKey: 'user_' + params.value.id
  })

  onRouted(() => {
    // When route changes (e.g., /users/:id), refetch for the new id
    refetch()
  })

  return (
    <section>
      <h2>User {params.value.id}</h2>
      <When>
        {loading}
        {() => <div>Loading…</div>}
        {error}
        {() => <div className="text-red-600">Error: {error.value}</div>}
        {() => (data.value ? <div>Name: {data.value.name}</div> : null)}
      </When>
    </section>
  ) as HTMLElement
}
`} />

      <h2>Manual Operations: asyncOp()</h2>
      <p>
        For user-triggered actions (form submissions, deletes), use <code>asyncOp</code>. It returns the
        same shape but does not auto-run; call <code>refetch()</code> to execute.
      </p>
      <CodeBlock language="tsx" filename="AsyncSubmit.tsx" code={`import { h } from 'auwla'
import { asyncOp, When } from 'auwla'

export function SaveButton() {
  const { data, loading, error, refetch } = asyncOp(async () => {
    const res = await window.fetch('/api/save', { method: 'POST' })
    if (!res.ok) throw new Error('Save failed')
    return res.json()
  })

  return (
    <div>
      <button onClick={() => refetch()} disabled={loading.value}>
        {loading.value ? 'Saving…' : 'Save'}
      </button>
      <When>
        {error}
        {() => <div className="text-red-600">{error.value}</div>}
        {() => (data.value ? <div>Saved: {JSON.stringify(data.value)}</div> : null)}
      </When>
    </div>
  ) as HTMLElement
}
`} />

      <h2>Best Practices</h2>
      <ul>
        <li>Start effects in <code>onMount</code>; always clean up with <code>onUnmount</code>.</li>
        <li>Use <code>onRouted</code> to react to navigation and refetch route-dependent data.</li>
        <li>Provide a <code>cacheKey</code> for frequently reused results to avoid redundant requests.</li>
        <li>Prefer <code>When</code> for conditional UI driven by <code>Ref</code>s instead of inlining <code>.value</code> checks.</li>
        <li>For lists from <code>Ref&lt;T[]&gt;</code>, render in a <code>When</code> fallback or derive with <code>watch</code>.</li>
        <li>Reserve <code>asyncOp</code> for manual actions; keep side effects idempotent and user-safe.</li>
      </ul>

      <p>
        Related reading: <Link to="/docs/routing/params-and-query" text="Params & Query" /> and{' '}
        <Link to="/docs/routing/composition" text="Route Composition" />.
      </p>
    </section>
  ) as HTMLElement
}
