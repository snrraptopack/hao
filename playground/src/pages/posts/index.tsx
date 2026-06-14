import { getRouted, Link, type RouteContext } from 'auwla/router'
import { track } from 'auwla/events'

export async function routed(ctx: RouteContext<'/posts'>, signal: AbortSignal) {
  return await track.get('posts.getPosts')
}

export default function PostsPage() {
  const loader = getRouted(routed)

  if (loader?.pending) {
    return <div>Loading posts…</div>
  }

  if (loader?.rejected) {
    return <div>Error: {String(loader.reason)}</div>
  }

  const posts = loader?.value ?? []

  return () => (
    <div>
      <h1>Posts</h1>
      <Link href="/posts/new">Create post</Link>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href="/posts/:id" params={{ id: post.id }}>
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
