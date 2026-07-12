import { Link } from 'auwla/router'

export default function HomePage() {
  return () => (
    <div class="page center">
      <h1>Auwla Playground edit justss</h1>
      <p>File-based routing + server functions + reactive forms + middleware.</p>
      <nav class="nav-row">
        <Link href="/posts" class="btn">Posts</Link>
        <Link href="/dashboard" class="btn">Dashboard</Link>
        <Link href="/login" class="btn primary">Sign in</Link>
      </nav>
    </div>
  )
}
