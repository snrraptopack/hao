import { remote, validate } from 'auwla/server'
import type { StandardSchema } from 'auwla/server'

type Post = { id: string; title: string }

const posts: Post[] = [
  { id: '1', title: 'Hello Auwla' },
  { id: '2', title: 'File-based routing' },
]

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

export const getPosts = remote.get(
  async (): Promise<{ id: string; title: string }[]> => posts,
)

export const createPost = remote.post(
  [validate(schema)],
  async (ctx): Promise<{ id: string; title: string }> => {
    const input = ctx.locals.input as { title: string }
    const post = { id: String(Date.now()), title: input.title }
    posts.push(post)
    return post
  },
)
