import { getRouted, Link, type RouteContext } from 'auwla/router'
import { track } from 'auwla/events'
import type { StandardSchema } from 'auwla/server'

const schema: StandardSchema = {
  '~standard': {
    validate: (value: unknown) => {
      const v = value as Record<string, unknown>
      const title = typeof v.title === 'string' ? v.title.trim() : ''
      const content = typeof v.content === 'string' ? v.content.trim() : ''
      if (title.length > 0 && content.length > 0) {
        return { value: { title, content } }
      }
      return { issues: [{ message: 'title and content are required' }] }
    },
  },
}

export async function routed(_ctx: RouteContext<'/posts'>, signal: AbortSignal) {
  return await track.get('posts.getPosts', { signal })
}

export default function PostsPage() {
  const loader = getRouted(routed)
  const me = track.get('auth.me')
  const create = track.form('posts.createPost', { schema })

  if (loader?.pending) return <div class="page">Loading posts…</div>
  if (loader?.rejected) return <div class="page error">Error: {String(loader.reason)}</div>

  const posts = loader?.value ?? []
  const user = me.value ?? null

  return () => (
    <div class="page">
      <h1>Posts</h1>

      {user && (
        <form onSubmit={create.onSubmit} class="form card">
          <h2>Create post</h2>
          <label>
            Title
            <input name="title" type="text" required />
          </label>
          <label>
            Content
            <textarea name="content" rows={3} required />
          </label>
          <button type="submit" disabled={create.pending} class="btn primary">
            {create.pending ? 'Saving…' : 'Create'}
          </button>
          {create.error && <p class="error">{create.error.message}</p>}
          {create.resolved && <p class="success">Created: {create.value?.title}</p>}
        </form>
      )}

      {!user && (
        <p class="hint">
          <Link href="/login" class="link">Sign in</Link> to create posts.
        </p>
      )}

      <ul class="post-list">
        {posts.map((post) => (
          <li key={post.id} class="card">
            <Link href="/posts/:id" params={{ id: post.id }} class="post-title">
              {post.title}
            </Link>
            <span class="meta">
              by {post.authorId} · {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
