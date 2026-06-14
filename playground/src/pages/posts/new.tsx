import { Link, navigate } from 'auwla/router'
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

export default function NewPostPage() {
  const create = track.form('posts.createPost', { schema })

  if (create.resolved && create.value?.id) {
    navigate(`/posts/${create.value.id}`)
  }

  return () => (
    <div class="page">
      <h1>Create post</h1>
      <form onSubmit={create.onSubmit} class="form card">
        <label>
          Title
          <input name="title" type="text" required />
        </label>
        <label>
          Content
          <textarea name="content" rows={5} required />
        </label>
        <button type="submit" disabled={create.pending} class="btn primary">
          {create.pending ? 'Saving…' : 'Save'}
        </button>
        {create.error && <p class="error">{create.error.message}</p>}
        {create.resolved && <p class="success">Created.</p>}
      </form>
      <Link href="/posts" class="btn">← Back to posts</Link>
    </div>
  )
}
