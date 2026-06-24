import { remote, validate, UnauthorizedError } from 'auwla/server'
import { getUserById } from './db'
import {
  SessionUser,
  encodeSession,
  sessionMiddleware,
  requireAuthMiddleware,
  requireAdminMiddleware,
} from './auth.middleware'

const SESSION_COOKIE = 'auwla_session'

/**
 * Returns the currently logged-in user, or null if anonymous.
 */
export const me = remote.get([sessionMiddleware], async (ctx) => {
  return ctx.locals.user
})

const loginSchema = {
  '~standard': {
    validate: (value: unknown) => {
      const v = value as Record<string, unknown>
      if (typeof v.username === 'string' && v.username.trim().length > 0) {
        return { value: { username: v.username.trim() } }
      }
      return { issues: [{ message: 'username is required' }] }
    },
  },
}

/**
 * Signs in a demo user and sets the session cookie.
 * In a real app this would verify a password hash.
 */
export const login = remote.post([validate(loginSchema)], async (ctx) => {
  const { username } = ctx.locals.input
  const user = getUserById(username === 'admin' ? 'u1' : 'u2')
  if (!user) throw new UnauthorizedError('Invalid credentials')

  const session: SessionUser = { id: user.id, name: user.name, role: user.role }
  ctx.cookies.set(SESSION_COOKIE, encodeSession(session), {
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
  })

  return { ok: true, user: session }
})

/**
 * Clears the session cookie.
 */
export const logout = remote.post([sessionMiddleware], async (ctx) => {
  ctx.cookies.delete(SESSION_COOKIE, { path: '/' })
  return { ok: true }
})

/**
 * Admin-only remote to list all users. Exercises middleware stacking.
 */
export const listUsers = remote.get(
  [sessionMiddleware, requireAuthMiddleware, requireAdminMiddleware],
  async () => {
    return {
      users: [
        { id: 'u1', name: 'Ada Admin', role: 'admin' },
        { id: 'u2', name: 'Ugo User', role: 'user' },
      ],
    }
  },
)
