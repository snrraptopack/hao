import { Link, navigate, type RouteComponent } from 'auwla/router'
import { track } from 'auwla/events'

export default function Layout(Child: RouteComponent) {
  const me = track.get('auth.me')
  console.log("data logged", me.value)
  const logout = track.post('auth.logout')
  const user = me.value as { id: string; name: string; role: string } | null | undefined
  return () => {
    return (
      <div class="app">
        <header class="topbar">
          <Link href="/" class="brand">Auwla</Link>
          <nav class="topnav">
            <Link href="/posts" activeClass="active">Posts</Link>
            <Link href="/dashboard" activeClass="active">Dashboard</Link>
            {user ? (
              <span class="user">
                {user.name} ({user.role})
                <button
                  type="button"
                  disabled={logout.pending}
                  class="btn small ghost"
                  onClick={() => logout.run().then(() => navigate('/'))}
                >
                  Sign out
                </button>
              </span>
            ) : (
              <Link href="/login" class="btn small primary">Sign in</Link>
            )}
          </nav>
        </header>
        <main class="main">
          <Child />
        </main>
      </div>
    )
  }
}
