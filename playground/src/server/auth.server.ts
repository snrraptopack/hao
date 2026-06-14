import { remote, defineMiddleware, validate } from 'auwla/server'
import type { StandardSchema } from 'auwla/server'
import { getUserById } from './db.server'

console.log('DEBUG: validate function is:', typeof validate, validate)

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

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie')
  if (!cookie) return null
  const match = cookie.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]!) : null
}

/**
 * Attaches the current session user to `ctx.locals.user` for every remote
 * function that includes it in its middleware chain.
 */
export const sessionMiddleware = defineMiddleware(async (ctx, next) => {
  const token = readCookie(ctx.request, SESSION_COOKIE)
  ctx.locals.user = decodeSession(token)
  return next()
})

/**
 * Blocks anonymous requests. Must run after `sessionMiddleware`.
 */
export const requireAuthMiddleware = defineMiddleware(async (ctx, next) => {
  if (!ctx.locals.user) {
    throw new Error('Unauthorized')
  }
  return next()
})

/**
 * Blocks non-admin requests. Must run after `sessionMiddleware`.
 */
export const requireAdminMiddleware = defineMiddleware(async (ctx, next) => {
  if ((ctx.locals.user as SessionUser | undefined)?.role !== 'admin') {
    throw new Error('Forbidden: admin only')
  }
  return next()
})

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify(body), { ...init, headers })
}

/**
 * Returns the currently logged-in user, or null if anonymous.
 */
export const me = remote.get([sessionMiddleware], async (ctx) => {
  return ((ctx.locals.user as SessionUser | undefined) ?? null) as { id: string; name: string; role: 'admin' | 'user' } | null
})

const loginSchema: StandardSchema = {
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
  const body = ctx.locals.input as { username?: string }
  const user = getUserById(body.username === 'admin' ? 'u1' : 'u2')
  if (!user) throw new Error('Invalid credentials')

  const session: SessionUser = { id: user.id, name: user.name, role: user.role }
  const headers = new Headers()
  headers.set(
    'set-cookie',
    `${SESSION_COOKIE}=${encodeSession(session)}; Path=/; HttpOnly; SameSite=Strict`,
  )

  return jsonResponse({ ok: true, user: session }, { headers })
})

/**
 * Clears the session cookie.
 */
export const logout = remote.post([sessionMiddleware], async () => {
  const headers = new Headers()
  headers.set('set-cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`)
  return jsonResponse({ ok: true }, { headers })
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
