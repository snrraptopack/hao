// main.tsx
import { Router, defineRoutes, back, useParams } from "../src/router/index"
import { createMemoApp, commit, component } from "auwla"
import {} from "auwla/jsx-runtime"

const fakeDb = {
  users: [
    { id: "1", name: "Kwame Mensah", role: "admin", bio: "Engineer from Accra" },
    { id: "2", name: "Ama Owusu", role: "user", bio: "Designer from Kumasi" },
    { id: "3", name: "Kofi Boateng", role: "user", bio: "PM from Takoradi" },
  ],
  posts: [
    { id: "1", userId: "1", title: "Building compilers", body: "Compilers are fun..." },
    { id: "2", userId: "1", title: "DSL design", body: "DSLs let you express..." },
    { id: "3", userId: "2", title: "Design systems", body: "Consistency is key..." },
  ],
}

defineRoutes([
  { path: "/", component: Home },
  { path: "/users", component: UserList },
  { path: "/user/:id", component: UserDetail },
  { path: "/user/:id/posts", component: UserPosts },
  { path: "*", component: NotFound },
])

function Home() {
  return () => (
    <section>
      <h1>Data fetching examples</h1>
      <a href="/users">View all users</a>
    </section>
  )
}

function UserList() {
  const self = component()

  type State =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; users: typeof fakeDb.users }

  let state: State = { status: "loading" }

  new Promise<typeof fakeDb.users>((res) =>
    setTimeout(() => res(fakeDb.users), 600)
  ).then((users) => {
    state = { status: "done", users }
    commit(self)
  }).catch((e) => {
    state = { status: "error", message: String(e) }
    commit(self)
  })

  return () => {
    console.log("3.......")
    if (state.status === "loading") return <p>Loading users...</p>
    if (state.status === "error") return <p>Error: {state.message}</p>
    return (
      <section>
        <h1>Users</h1>
        {state.users.map(u => (
          <div key={u.id}>
            <a href={`/user/${u.id}`}>{u.name}</a>
            <span> — {u.role}</span>
          </div>
        ))}
      </section>
    )
  }
}

function UserDetail() {
  const self = component()
  const params = useParams()

  type State =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; user: (typeof fakeDb.users)[0] }

  let state: State = { status: "loading" }

  function load() {
    state = { status: "loading" }
    commit(self)
    new Promise<(typeof fakeDb.users)[0] | undefined>((res) =>
      setTimeout(() => res(fakeDb.users.find(u => u.id === params.id)), 800)
    ).then((u) => {
      if (!u) { state = { status: "error", message: "User not found" }; commit(self); return }
      state = { status: "done", user: u }
      commit(self)
    }).catch((e) => {
      state = { status: "error", message: String(e) }
      commit(self)
    })
  }

  load()

  return () => {
    console.log("2......")
    if (state.status === "loading") return <p>Loading user {params.id}...</p>
    if (state.status === "error") return <p>Error: {state.message}</p>
    const u = state.user
    return (
      <section>
        <button onClick={() => back()}>Back</button>
        <h1>{u.name}</h1>
        <p>{u.bio}</p>
        <p>Role: {u.role}</p>
        <a href={`/user/${u.id}/posts`}>View posts</a>
        <br />
        <button onClick={load}>Refetch</button>
      </section>
    )
  }
}

function UserPosts() {
  const self = component()
  const params = useParams()

  type State =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; user: (typeof fakeDb.users)[0]; posts: typeof fakeDb.posts }

  let state: State = { status: "loading" }

  Promise.all([
    new Promise<(typeof fakeDb.users)[0] | undefined>((res) =>
      setTimeout(() => res(fakeDb.users.find(u => u.id === params.id)), 500)
    ),
    new Promise<typeof fakeDb.posts>((res) =>
      setTimeout(() => res(fakeDb.posts.filter(p => p.userId === params.id)), 700)
    ),
  ]).then(([user, posts]) => {
    if (!user) { state = { status: "error", message: "User not found" }; commit(self); return }
    state = { status: "done", user, posts }
    commit(self)
  }).catch((e) => {
    state = { status: "error", message: String(e) }
    commit(self)
  })

  return () => {
    console.log("1 .....")
    if (state.status === "loading") return <p>Loading...</p>
    if (state.status === "error") return <p>Error: {state.message}</p>
    const { user, posts } = state
    return (
      <section>
        <button onClick={() => back()}>Back</button>
        <h1>{user.name}'s posts</h1>
        {posts.length === 0 && <p>No posts yet</p>}
        {posts.map(post => (
          <div key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.body}</p>
          </div>
        ))}
      </section>
    )
  }
}

function NotFound() {
  return () => <section><h1>404 — not found</h1></section>
}

function App() {
  return () => (
    <main>
      <nav>
        <a href="/">Home</a>
        <a href="/users">Users</a>
      </nav>
      <Router />
    </main>
  )
}

createMemoApp(document.getElementById("app")!, <App/>)
