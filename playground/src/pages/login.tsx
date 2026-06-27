import { Link, navigate } from 'auwla/router'
import { track } from 'auwla/track'
import type { StandardSchema } from 'auwla/server'

const schema: StandardSchema = {
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

export default function LoginPage() {
  const login = track.form('auth.login', {
    schema,
    // onSuccess: () => navigate("/dashboard")
  })

  // const isLoggedIn = login.resolved
  // console.log("islogged in", isLoggedIn)

  if (login.resolved) {
    console.log("logged")
    return navigate("/dashboard")
  }

  return () => (
    <div class="page">
      <h1>Sign in</h1>
      <p class="hint">Try <strong>admin</strong> for Ada or any other name for Ugo.</p>
      <form {...login.props} class="form card">
        <label>
          Username
          <input name="username" type="text" placeholder="admin" required />
        </label>
        <button type="submit" disabled={login.pending} class="btn primary">
          {login.pending ? 'Signing in…' : 'Sign in'}
        </button>
        {login.error && <p class="error">{login.error.message}</p>}
      </form>
      <Link href="/" class="link">← Back to home</Link>
    </div>
  )
}
