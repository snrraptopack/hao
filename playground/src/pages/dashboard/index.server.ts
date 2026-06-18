import { remote } from 'auwla/server'
import { getAllPosts, getPostsByAuthor } from '../../server/db'
import {
  requireAdminMiddleware,
  requireAuthMiddleware,
  sessionMiddleware,
} from '../../server/auth.middleware'

export const getDashboard = remote.get(
  [sessionMiddleware, requireAuthMiddleware],
  async (ctx) => {
    const user = ctx.locals.user as { id: string; name: string; role: 'admin' | 'user' }
    const all = getAllPosts()
    const mine = getPostsByAuthor(user.id)
    return {
      totalPosts: all.length,
      myPosts: mine.length,
      isAdmin: user.role === 'admin',
    }
  },
)

export const getAdminStats = remote.get(
  [sessionMiddleware, requireAuthMiddleware, requireAdminMiddleware],
  async () => {
    return {
      totalPosts: getAllPosts().length,
      users: 2,
    }
  },
)
