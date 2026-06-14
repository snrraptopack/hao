import { remote, validate, getParams } from 'auwla/server'
import type { StandardSchema } from 'auwla/server'
import { deletePost as deletePostDb, getPostById, updatePost as updatePostDb } from '../../server/db.server'
import { requireAuthMiddleware, sessionMiddleware } from '../../server/auth.server'

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

export const getPost = remote.get([sessionMiddleware], async () => {
  const { id } = getParams<'/posts/:id'>()
  const post = getPostById(id)
  if (!post) throw new Error('Post not found')
  return post
})

export const updatePost = remote.post(
  [sessionMiddleware, requireAuthMiddleware, validate(updateSchema)],
  async (ctx) => {
    const { id } = getParams<'/posts/:id'>()
    const user = ctx.locals.user as { id: string }
    const input = ctx.locals.input as { title: string; content: string }
    return updatePostDb(id, input, user.id)
  },
)

export const deletePost = remote.post(
  [sessionMiddleware, requireAuthMiddleware],
  async (ctx) => {
    const { id } = getParams<'/posts/:id'>()
    const user = ctx.locals.user as { id: string }
    deletePostDb(id, user.id)
    return { ok: true }
  },
)
