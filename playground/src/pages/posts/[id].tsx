import { getParams, getRouted, Link, navigate, type RouteContext } from 'auwla/router'
import { track } from 'auwla/track'
import type { StandardSchema } from 'auwla/server'
import { getPost } from "./[id].server"

const updateSchema: StandardSchema = {
  '~standard': {
    validate: (value: unknown) => {
      const v = value as Record<string, unknown>
      const title = typeof v.title === 'string' ? v.title.trim() : ''
      const content = typeof v.content === 'string' ? v.content.trim() : ''
      if (title.length > 0 || content.length > 0) {
        return { value: { title, content } }
      }
      return { issues: [{ message: 'title or content is required' }] }
    },
  },
}

export async function routed(ctx: RouteContext<'/posts/:id'>, signal: AbortSignal) {
  return await track.get(getPost, { signal })
}



export default function PostPage() {
  const { id } = getParams('/posts/:id')
  const loader = getRouted(routed)
  console.log("loader", loader?.value)
  const me = track.get('auth.me')
  const update = track.form('posts.updatePost', { schema: updateSchema })
  const remove = track.post('posts.deletePost')

  if (loader?.pending) return () => <div class="page">Loading post {id}…</div>
  if (loader?.rejected) {
    return (
      <div class="page">
        <h1>Error</h1>
        <p class="error">{String(loader.reason)}</p>
        <Link href="/posts" class="btn">← Back to posts</Link>
      </div>
    )
  }

  const post = loader?.value
  const user = me.value ?? null
  const isAuthor = !!user && post?.authorId === user.id
  const isAdmin = user?.role === 'admin'
  const canEdit = isAuthor || isAdmin

  return () => (
    <div class="page">
      <article class="card">
        <h1>{post?.title}</h1>
        <p class="meta">
          Post ID: {id} · by {post?.authorId} · {post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
        </p>
        <p class="content">{post?.content}</p>
      </article>

      {canEdit && post && (
        <form onSubmit={update.onSubmit} class="form card">
          <h2>Edit post</h2>
          <input type="hidden" name="id" value={post.id} />
          <label>
            Title
            <input name="title" type="text" defaultValue={post.title} required />
          </label>
          <label>
            Content
            <textarea name="content" rows={4} required defaultValue={post.content} />
          </label>
          <div class="row">
            <button type="submit" disabled={update.pending} class="btn primary">
              {update.pending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={remove.pending}
              class="btn danger"
              onClick={() => remove.run().then(() => navigate('/posts'))}
            >
              {remove.pending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
          {update.error && <p class="error">{update.error.message}</p>}
          {update.resolved && <p class="success">Saved.</p>}
          {remove.rejected && <p class="error">{String(remove.reason)}</p>}
        </form>
      )}

      <Link href="/posts" class="btn">← Back to posts</Link>
    </div>
  )
}
