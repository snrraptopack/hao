import {} from 'auwla/jsx-runtime'
import { Link } from 'auwla/router'
import { track } from 'auwla/events'
import type { StandardSchema } from 'auwla/server'

const schema: StandardSchema = {
  '~standard': {
    validate: (value: unknown) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { title: unknown }).title === 'string' &&
        (value as { title: string }).title.trim().length > 0
      ) {
        return { value }
      }
      return { issues: [{ message: 'title is required' }] }
    },
  },
}

export default function NewPostPage() {
  const create = track.form('posts.createPost', { schema })

  return () => (
    <div>
      <h1>Create post</h1>
      <form onSubmit={create.onSubmit}>
        <label>
          Title
          <input name="title" type="text" required />
        </label>
        <button type="submit" disabled={create.pending}>
          {create.pending ? 'Saving…' : 'Save'}
        </button>
        {create.error && <p style="color:red">{create.error.message}</p>}
        {create.resolved && <p>Created: {create.value?.title}</p>}
      </form>
      <Link href="/posts">← Back to posts</Link>
    </div>
  )
}
