import { remote, validate, getParams, NotFoundError } from 'auwla/server'
import { deletePost as deletePostDb, getPostById, updatePost as updatePostDb } from '../../server/db'
import { requireAuthMiddleware, sessionMiddleware } from '../../server/auth.middleware'

const updateSchema = {
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
  const { id } = getParams()
  const post = getPostById(id)
  if (!post) throw new NotFoundError('Post not found')
  await new Promise((resolve) => setTimeout(resolve, 500))
  return post
})

export const updatePost = remote.post(
  [sessionMiddleware, requireAuthMiddleware, validate(updateSchema)],
  async (ctx) => {
    const { id } = getParams<'/posts/:id'>()
    const user = ctx.locals.user
    const input = ctx.locals.input
    return updatePostDb(id, input, user.id)
  },
)

export const deletePost = remote.post(
  [sessionMiddleware, requireAuthMiddleware],
  async (ctx) => {
    const { id } = getParams()
    const user = ctx.locals.user
    deletePostDb(id, user.id)
    return { ok: true }
  },
)
