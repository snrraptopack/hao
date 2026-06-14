import { Link } from 'auwla/router'

export default function HomePage() {
  return () => (
    <div>
      <h1>Auwla Playground</h1>
      <p>File-based routing + server functions + reactive forms.</p>
      <nav>
        <Link href="/posts">Posts</Link>
      </nav>
    </div>
  )
}
