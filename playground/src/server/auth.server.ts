import { remote, defineMiddleware, validate, UnauthorizedError, ForbiddenError, ServerContext } from 'auwla/server'
import type { StandardSchema } from 'auwla/server'
import { getUserById } from './db'

export type SessionUser = { id: string; name: string; role: 'admin' | 'user' }

const SESSION_COOKIE = 'auwla_session'

function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

function decodeSession(token: string | null): SessionUser | null {
  if (!token) return null
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as SessionUser
    if (parsed && typeof parsed.id === 'string') return parsed
    return null
  } catch {
    return null
  }
}

/**
 * Attaches the current session user to `ctx.locals.user` for every remote
 * function that includes it in its middleware chain.
 */
export const sessionMiddleware = defineMiddleware<{ user: SessionUser | null }>(async (ctx, next) => {
  const token = ctx.cookies.get(SESSION_COOKIE) ?? null
  ctx.locals.user = decodeSession(token)
  return next()
})

/**
 * Blocks anonymous requests. Must run after `sessionMiddleware`.
 */
export const requireAuthMiddleware = defineMiddleware<{ user: SessionUser }>(async (
  ctx: ServerContext<any, any, { user: SessionUser | null }>,
  next,
) => {
  if (!ctx.locals.user) {
    throw new UnauthorizedError('Unauthorized')
  }
  return next()
})

/**
 * Blocks non-admin requests. Must run after `sessionMiddleware`.
 */
export const requireAdminMiddleware = defineMiddleware(async (
  ctx: ServerContext<any, any, { user: SessionUser }>,
  next,
) => {
  if (ctx.locals.user.role !== 'admin') {
    throw new ForbiddenError('Forbidden: admin only')
  }
  return next()
})

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

console.log('DEBUG: validate(loginSchema) returned:', typeof validate(loginSchema), validate(loginSchema))

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
