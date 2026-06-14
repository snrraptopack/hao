import { getParams, getRouted, Link, type RouteContext } from 'auwla/router'
import { track } from 'auwla/events'

export async function routed(ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) {
  return await track.get('posts.getPost',{signal})
}

export default function PostPage() {
  const { id } = getParams('/posts/:id')
  const loader = getRouted(routed)

  if (loader?.pending) {
    return <div>Loading post {id}…</div>
  }

  if (loader?.rejected) {
    return <div>Error: {String(loader.reason)}</div>
  }

  const post = loader?.value

  return () => (
    <div>
      <h1>{post?.title ?? 'Not found'}</h1>
      <p>Post ID: {id}</p>
      <Link href="/posts">← Back to posts</Link>
    </div>
  )
}
