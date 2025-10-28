import { h, Fragment, defineRoutes, group, Link } from 'auwla'

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
  )
}

function Home() {
  return (
    <section>
      <h1>Auwla Starter</h1>
      <p>Welcome! Edit <code>src/routes.tsx</code> to add pages.</p>
    </section>
  ) as HTMLElement
}

function About() {
  return (
    <section>
      <h1>About</h1>
      <p>This app was scaffolded with <code>create-auwla</code>.</p>
    </section>
  ) as HTMLElement
}

function User(params?: { id: string }) {
  return (
    <section>
      <h1>User</h1>
      <p>ID: {params?.id}</p>
    </section>
  ) as HTMLElement
}

const baseRoutes = defineRoutes([
  { path: '/', component: Home, name: 'home' },
  { path: '/about', component: About, name: 'about' },
  { path: '/users/:id', component: User, name: 'user' },
])

const routes = group('/', { layout: BaseLayout }, baseRoutes)

export default routes