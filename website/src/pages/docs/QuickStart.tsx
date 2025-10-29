import { h } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsQuickStart() {
  return (
    <section class="docs-prose">
      <h1>Quick Start</h1>
      <p>Quick Start uses the scaffolded template, which includes a router. You’ll get a working app out of the box. Import <code>h</code> in TSX files to satisfy TypeScript, and write pages as plain functions.</p>

      <h2>1) Scaffold</h2>
      <CodeBlock language="bash" code={`npm create auwla@latest`} />

      <h2>2) Install & Run</h2>
      <CodeBlock language="bash" code={`npm install\nnpm run dev`} />
      <p>Open <code>http://localhost:5173</code>. The template already wires up routing and mounts to <code>#app</code>.</p>

      <h2>3) What you get</h2>
      <p>The minimal template includes:</p>
      <ul>
        <li><code>src/main.tsx</code>: creates and starts the router, mounting routes to <code>#app</code>.</li>
        <li><code>src/routes.tsx</code>: defines a layout with <code>Link</code> navigation and three pages (Home, About, User).</li>
      </ul>
      <CodeBlock language="tsx" filename="src/routes.tsx (excerpt)" code={`import { h, Fragment, defineRoutes, group, Link } from 'auwla'

function BaseLayout(child: HTMLElement) {
  return (
    <div class="container" style={{ padding: '1rem' }}>
      <nav style={{ marginBottom: '1rem', display: 'flex', gap: '.5rem' }}>
        <Link to="/" text="Home" className="btn" activeClassName="active" />
        <Link to="/about" text="About" className="btn" activeClassName="active" />
        <Link to="/users/42" text="User 42" className="btn" activeClassName="active" />
      </nav>
      <main>{child}</main>
    </div>
  ) as HTMLElement
}

function Home() {
  return (
    <section>
      <h1>Auwla Starter</h1>
      <p>Welcome! Edit <code>src/routes.tsx</code> to add pages.</p>
    </section>
  ) as HTMLElement
}

function About() { /* ... */ }
function User(params?: { id: string }) { /* ... */ }

const baseRoutes = defineRoutes([
  { path: '/', component: Home, name: 'home' },
  { path: '/about', component: About, name: 'about' },
  { path: '/users/:id', component: User, name: 'user' },
])

export default group('/', { layout: BaseLayout }, baseRoutes)
`} />

      <h2>4) Add a page</h2>
      <p>Create a simple TSX page as a plain function and import <code>h</code> to keep TypeScript happy.</p>
      <CodeBlock language="tsx" filename="src/pages/Hello.tsx" code={`import { h } from 'auwla'

export function Hello() {
  return (
    <section>
      <h1>Hello Auwla</h1>
      <p>It works!</p>
    </section>
  ) as HTMLElement
}
`} />

      <p>Register the new route in <code>src/routes.tsx</code> and (optionally) add a nav link:</p>
      <CodeBlock language="tsx" filename="src/routes.tsx (additions)" code={`import { Hello } from './pages/Hello'

const baseRoutes = defineRoutes([
  { path: '/', component: Home, name: 'home' },
  { path: '/about', component: About, name: 'about' },
  { path: '/users/:id', component: User, name: 'user' },
  { path: '/hello', component: Hello, name: 'hello' }, // new
])

// In BaseLayout nav:
// <Link to="/hello" text="Hello" className="btn" activeClassName="active" />
`} />

      <p>Save and reload. Click “Hello” in the nav or visit <code>/hello</code>.</p>
    </section>
  ) as HTMLElement
}