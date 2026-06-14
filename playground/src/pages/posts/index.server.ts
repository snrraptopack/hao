import { remote, validate } from 'auwla/server'
import type { StandardSchema } from 'auwla/server'
import { createPost as createPostDb, getAllPosts } from '../../server/db.server'
import { requireAuthMiddleware, sessionMiddleware } from '../../server/auth.server'

const createSchema: StandardSchema = {
  '~standard': {
    validate: (value: unknown) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { title: unknown }).title === 'string' &&
        (value as { title: string }).title.trim().length > 0 &&
        typeof (value as { content: unknown }).content === 'string' &&
        (value as { content: string }).content.trim().length > 0
      ) {
        return { value }
      }
      return { issues: [{ message: 'title and content are required' }] }
    },
  },
}

/**
 * Lists every post. The session middleware is included so the client can
 * optionally receive the current user alongside the list.
 */
export const getPosts = remote.get([sessionMiddleware], async () => {
  return getAllPosts().map((p) => ({
    id: p.id,
    title: p.title,
    authorId: p.authorId,
    createdAt: p.createdAt,
  }))
})

/**
 * Creates a post. Auth + validation middleware run before the handler.
 */
export const createPost = remote.post(
  [sessionMiddleware, requireAuthMiddleware, validate(createSchema)],
  async (ctx) => {
    const input = ctx.locals.input as { title: string; content: string }
    const user = ctx.locals.user as { id: string; name: string; role: string }
    const post = createPostDb(input, user.id)
    return {
      id: post.id,
      title: post.title,
      authorId: post.authorId,
      createdAt: post.createdAt,
    }
  },
)
