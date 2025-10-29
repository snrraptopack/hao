import { h, Link } from 'auwla'
import { CodeBlock } from '../../../components/CodeBlock'

export function DocsRoutingIntroduction() {
  return (
    <section class="docs-prose">
      <h1>Routing: Introduction</h1>
      <p>
        This introduction focuses on the <code>Link</code> component — the primary, declarative way to
        navigate in Auwla. It covers the full API, how <code>href</code> is constructed, active-state
        behavior, and best practices for parameters and query strings.
      </p>

      <h2>Basic Usage</h2>
      <p>
        <code>Link</code> renders an anchor and integrates with the router: it builds its <code>href</code>,
        observes the current path to set an active class, and intercepts clicks to perform client-side
        navigation via <code>router.push()</code>.
      </p>
      <CodeBlock language="tsx" filename="BasicLink.tsx" code={`import { h, Link } from 'auwla'

export function Nav() {
  return (
    <nav class="flex gap-2">
      <Link to="/docs/" text="Docs" className="px-3 py-1 rounded hover:bg-gray-100" activeClassName="bg-gray-50 font-medium" />
      <Link to="/docs/routing/" text="Routing" className="px-3 py-1 rounded hover:bg-gray-100" activeClassName="bg-indigo-50 text-indigo-700" />
    </nav>
  ) as HTMLElement
}
`} />

      <h2>Link API</h2>
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
        <li><code>params</code>: values to replace named segments in <code>to</code> (e.g. <code>{'{ id: 42 }'}</code> for <code>/users/:id</code>).</li>
        <li><code>query</code>: key/value pairs serialized into the URL query string.</li>
        <li><code>text</code>: link text; accepts a string or a reactive <code>Ref&lt;string&gt;</code>.</li>
        <li><code>className</code>: base classes for styling (string or reactive <code>Ref</code>).</li>
        <li><code>activeClassName</code>: classes appended when the link is active.</li>
      </ul>

      <h3>Href Construction</h3>
      <p>
        The <code>href</code> is derived from <code>to</code>, optionally replacing any <code>:param</code>
        segments using <code>params</code> and appending a query string built from <code>query</code>.
        Values are URL-encoded.
      </p>
      <CodeBlock language="tsx" filename="ParamsAndQuery.tsx" code={`<Link
  to="/users/:id"
  params={{ id: 42 }}
  query={{ tab: 'posts', page: 2 }}
  text="User Posts"
/> // href => "/users/42?tab=posts&page=2"
`} />

      <p>
        You can also pre-build a URL using <code>pathFor()</code> and pass it as <code>to</code> if you
        prefer.
      </p>
      <CodeBlock language="tsx" filename="PathForWithLink.tsx" code={`import { pathFor } from 'auwla'

const url = pathFor('/users/:id', { id: 42 }, { tab: 'posts' })
<Link to={url} text="Open" />
`} />

      <h3>Active State</h3>
      <p>
        Active detection compares the current path (without query) to the link’s <code>href</code> (also
        without query). When active, <code>activeClassName</code> is appended to the base classes.
      </p>
      <CodeBlock language="tsx" filename="ActiveClass.tsx" code={`<Link
  to="/docs/routing/"
  text="Routing"
  className="px-3 py-1 rounded"
  activeClassName="bg-indigo-600 text-white"
/> // active when current path is "/docs/routing/" (query ignored)
`} />

      <h3>Reactive Text and Classes</h3>
      <p>
        <code>text</code> and <code>className</code> accept <code>Ref&lt;string&gt;</code>. <code>Link</code>
        watches them so both the label and the classes can update reactively.
      </p>
      <CodeBlock language="tsx" filename="ReactiveProps.tsx" code={`import { h, Link, ref } from 'auwla'

const label = ref('Profile')
const cls = ref('px-3 py-1 rounded')

setTimeout(() => {
  label.value = 'Account'
  cls.value = 'px-3 py-1 rounded bg-gray-50'
}, 2000)

export function ReactiveNav() {
  return <Link to="/account" text={label} className={cls} activeClassName="text-indigo-700" /> as HTMLElement
}
`} />

      <h3>Navigation Behavior</h3>
      <ul>
        <li>Clicks are intercepted (<code>preventDefault()</code>) and routed via <code>router.push(href)</code>.</li>
        <li>
          If the router is not initialized, <code>Link</code> still renders with the provided
          <code>href</code> and <code>className</code> but logs an error on click.
        </li>
        <li>
          Open-in-new-tab and modifier-clicks are not supported by default since clicks are always intercepted.
          If you need that behavior, render a plain <code>&lt;a&gt;</code> for external URLs or build a custom
          link wrapper.
        </li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li>Prefer <code>params</code>/<code>query</code> or <code>pathFor()</code> over manual string concatenation.</li>
        <li>Keep <code>activeClassName</code> minimal and additive to avoid layout shifts.</li>
        <li>Use semantic text and ensure contrast for accessibility; <code>Link</code> renders an anchor.</li>
        <li>For programmatic navigation (buttons, side-effects), use <code>useRouter()</code> and <code>router.push()</code>.</li>
      </ul>

      <p>
        Next, dive deep into <Link to="/docs/routing/composition" text="Route Composition" /> to learn how
        to define, group, and compose routes with guards and layouts.
      </p>
    </section>
  ) as HTMLElement
}