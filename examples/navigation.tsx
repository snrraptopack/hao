// navigation.tsx
// Demonstrates: Link (active/exact-active classes), isActive, isExactActive,
// navigate with replace, route meta, getParams, getQuery, getRouteMeta.
//
// Routes:
//   /              → Home
//   /users         → UserList
//   /users/:id     → UserDetail  (reads getParams in setup)
//   /admin         → Admin       (protected via beforeEnter + meta)
//   /login         → Login       (uses navigate with replace on success)
//   *              → NotFound

import {} from "auwla/jsx-runtime"
import { createMemoApp } from "auwla"
import {
  Router,
  Link,
  defineRoutes,
  navigate,
  back,
  getParams,
  getQuery,
  getRouteMeta,
  isActive,
} from "auwla/router"

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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

defineRoutes([
  { path: "/",         component: Home      },
  { path: "/users",    component: UserList  },
  { path: "/users/:id", component: UserDetail },
  {
    path: "/admin",
    // meta is just data — the router never inspects it.
    // beforeEnter reads it here for the auth check pattern.
    meta: { requiresAuth: true, title: "Admin Panel" },
    beforeEnter: () => loggedIn || "/login",
    component: Admin,
  },
  { path: "/login",    component: Login     },
  { path: "*",         component: NotFound  },
])

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
          <li>Open <strong>/users</strong> and drill into a user detail page.</li>
          <li>Try <strong>/admin</strong> — you'll be redirected to login.</li>
          <li>On the login page, submit the form and notice the URL <em>replaces</em> (no extra back entry).</li>
          <li>Add <code>?highlight=true</code> to a user URL and see it read in setup.</li>
        </ul>
      </div>

      <div class="card">
        <h2>isActive check (live)</h2>
        <p>
          <code>isActive("/")</code> right now:{" "}
          <strong style={{ color: isActive("/") ? "#3fb950" : "#f85149" }}>
            {String(isActive("/"))}
          </strong>
        </p>
        <p style={{ marginTop: "6px" }}>
          <code>isActive("/users")</code> right now:{" "}
          <strong style={{ color: isActive("/users") ? "#3fb950" : "#f85149" }}>
            {String(isActive("/users"))}
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
              {/* Link auto-applies active/exact-active when on /users/:id */}
              <Link href={`/users/${u.id}`}>{u.name}</Link>
              <span class={`role-badge role-${u.role}`}>{u.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function UserDetail() {
  // getParams is safe in setup — the router creates a new component instance
  // every time the path changes, so params are always fresh here.
  const { id } = getParams()

  // getQuery is also safe in setup for the same reason.
  // /users/1?highlight=true → { highlight: 'true' }
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
                <Link href={`/users/${u.id}`}>{u.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
}

function Admin() {
  // getRouteMeta reads the meta object of the currently matched route.
  // Generic param narrows the type at the call site.
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
              // replace so the admin page is not in the back stack after logout
              navigate("/", { replace: true })
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
      // replace — the login page should not be in the back stack once
      // the user is authenticated and redirected to the protected area.
      navigate("/admin", { replace: true })
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
// App shell — the nav uses <Link> so active classes are applied automatically
// ---------------------------------------------------------------------------

function App() {
  return () => (
    <div>
      <nav>
        <span class="brand">auwla</span>
        {/* exact-active fires only on "/", active would fire on every route */}
        <Link href="/" exactActiveClass="exact-active" activeClass="">Home</Link>
        <Link href="/users">Users</Link>
        <Link href="/admin">Admin</Link>
      </nav>
      <main>
        <Router />
      </main>
    </div>
  )
}

createMemoApp(document.getElementById("app")!, <App />)
