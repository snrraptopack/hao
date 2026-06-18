import { defineMiddleware, UnauthorizedError, ForbiddenError, ServerContext } from 'auwla/server'

export type SessionUser = { id: string; name: string; role: 'admin' | 'user' }

const SESSION_COOKIE = 'auwla_session'

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

export function decodeSession(token: string | null): SessionUser | null {
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
