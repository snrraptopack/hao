// navigation.tsx
// Demonstrates: Link (active/exact-active classes), isActive, isExactActive,
// navigate with replace, route meta, getParams, getQuery, getRouteMeta.

import {} from "auwla/jsx-runtime"
import {
  Router,
  Link,
  navigate,
  back,
  getParams,
  getQuery,
  getRouteMeta,
  isActive,
} from "auwla/router"
import type { Route } from "auwla/router"

// ---------------------------------------------------------------------------
// Fake session — in a real app this would be real auth state
// ---------------------------------------------------------------------------

let loggedIn = false

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const USERS = [
  { id: "1", name: "Kwame Mensah",  role: "admin",  color: "#1f3a5f", text: "#58a6ff", bio: "Compiler engineer from Accra."   },
  { id: "2", name: "Ama Owusu",     role: "editor", color: "#1f3a2f", text: "#3fb950", bio: "Design systems lead from Kumasi." },
  { id: "3", name: "Kofi Boateng",  role: "viewer", color: "#2d2a1f", text: "#d29922", bio: "Product manager from Takoradi."   },
]

const navigationRoutes: Route[] = [
  { path: "/", component: Home },
  { path: "/users", component: UserList },
  { path: "/users/:id", component: UserDetail },
  {
    path: "/admin",
    meta: { requiresAuth: true, title: "Admin Panel" },
    beforeEnter: () => loggedIn || "/navigation/login",
    component: Admin,
  },
  { path: "/login", component: Login },
  { path: "*", component: NotFound },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Home() {
  return () => (
    <div>
      <h1>Navigation demo</h1>
      <p style={{ marginBottom: "24px" }}>
        Demonstrates <code>Link</code>, active classes, route meta, guarded
        routes, and <code>navigate({"{ replace: true }"})</code>.
      </p>

      <div class="card">
        <h2>What to try</h2>
        <ul style={{ paddingLeft: "18px", color: "#8b949e", fontSize: "14px", lineHeight: "2" }}>
          <li>Click the nav links and watch the active/exact-active border update.</li>
          <li>Open <strong>/navigation/users</strong> and drill into a user detail page.</li>
          <li>Try <strong>/navigation/admin</strong> — you'll be redirected to login.</li>
          <li>On the login page, submit the form and notice the URL <em>replaces</em> (no extra back entry).</li>
          <li>Add <code>?highlight=true</code> to a user URL and see it read in setup.</li>
        </ul>
      </div>

      <div class="card">
        <h2>isActive check (live)</h2>
        <p>
          <code>isActive("/navigation")</code> right now:{" "}
          <strong style={{ color: isActive("/navigation") ? "#3fb950" : "#f85149" }}>
            {String(isActive("/navigation"))}
          </strong>
        </p>
        <p style={{ marginTop: "6px" }}>
          <code>isActive("/navigation/users")</code> right now:{" "}
          <strong style={{ color: isActive("/navigation/users") ? "#3fb950" : "#f85149" }}>
            {String(isActive("/navigation/users"))}
          </strong>
        </p>
      </div>
    </div>
  )
}

function UserList() {
  return () => (
    <div>
      <h1>Users</h1>
      <div class="card">
        <ul class="user-list">
          {USERS.map((u) => (
            <li key={u.id}>
              <div class="avatar" style={{ background: u.color, color: u.text }}>
                {u.name[0]}
              </div>
              <Link href={`/navigation/users/${u.id}`}>{u.name}</Link>
              <span class={`role-badge role-${u.role}`}>{u.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function UserDetail() {
  const { id } = getParams()
  const query = getQuery()
  const highlight = query.highlight === "true"
  const user = USERS.find((u) => u.id === id)

  if (!user) {
    return ()=> (
      <div>
        <button class="back" onClick={() => back()}>← Back</button>
        <div class="card"><p>User "{id}" not found.</p></div>
      </div>
    )
  }

  return ()=> (
      <div>
        <button class="back" onClick={() => back()}>← Back</button>

        <div
          class="card"
          style={highlight ? { borderColor: user.text } : undefined}
        >
          <div class="meta-strip">
            <span class={`role-badge role-${user.role}`}>{user.role}</span>
            {highlight && <span class="meta-tag">highlighted</span>}
          </div>
          <h1>{user.name}</h1>
          <p>{user.bio}</p>
          <p style={{ marginTop: "12px", fontSize: "13px", color: "#484f58" }}>
            Try adding <code>?highlight=true</code> to the URL — it's read in setup,
            not inside the render closure.
          </p>
        </div>

        <div class="card">
          <h2>Other users</h2>
          <ul class="user-list">
            {USERS.filter((u) => u.id !== id).map((u) => (
              <li key={u.id}>
                <div class="avatar" style={{ background: u.color, color: u.text }}>
                  {u.name[0]}
                </div>
                <Link href={`/navigation/users/${u.id}`}>{u.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
}

function Admin() {
  const { title } = getRouteMeta<{ requiresAuth: boolean; title: string }>()

  return () => (
    <div>
      <h1>{title}</h1>
      <div class="card">
        <div class="meta-strip">
          <span class="meta-tag">requires auth</span>
          <span class="meta-tag">meta.title = {title}</span>
        </div>
        <p>You are logged in. This page was protected by <code>beforeEnter</code>.</p>
        <p style={{ marginTop: "12px" }}>
          <button
            class="btn"
            style={{ width: "auto", padding: "8px 16px", background: "#b62324" }}
            onClick={() => {
              loggedIn = false
              navigate("/navigation", { replace: true })
            }}
          >
            Log out
          </button>
        </p>
      </div>
    </div>
  )
}

function Login() {
  let username = ""
  let password = ""
  let error    = ""

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (username === "admin" && password === "1234") {
      loggedIn = true
      navigate("/navigation/admin", { replace: true })
    } else {
      error = "Wrong credentials. Try admin / 1234."
    }
  }

  return () => (
    <div>
      <h1>Log in</h1>
      <div class="card" style={{ maxWidth: "380px" }}>
        {error ? (
          <p style={{ color: "#f85149", marginBottom: "14px", fontSize: "13px" }}>
            {error}
          </p>
        ) : null}
        <form onSubmit={submit}>
          <div class="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              placeholder="admin"
              onInput={(e: InputEvent) => {
                username = (e.target as HTMLInputElement).value
                error = ""
              }}
            />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              placeholder="1234"
              onInput={(e: InputEvent) => {
                password = (e.target as HTMLInputElement).value
                error = ""
              }}
            />
          </div>
          <button type="submit" class="btn">Sign in</button>
        </form>
      </div>
    </div>
  )
}

function NotFound() {
  return () => (
    <div class="not-found">
      <div class="code">404</div>
      <p>Page not found</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

function App() {
  return () => (
    <div class="navigation-example">
      <nav>
        <span class="brand">auwla</span>
        <Link href="/navigation" exactActiveClass="exact-active" activeClass="">Home</Link>
        <Link href="/navigation/users">Users</Link>
        <Link href="/navigation/admin">Admin</Link>
      </nav>
      <main>
        <Router routes={navigationRoutes} base="/navigation" />
      </main>
    </div>
  )
}

export function NavigationExample() {
  return () => <App />;
}
