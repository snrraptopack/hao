// loader.tsx — demonstrates the router loader API with typed getLoaderHandle<T>()
//
// Routes:
//   /           → Home (no loader, instant render)
//   /posts      → PostList (loader fetches all posts)
//   /posts/:id  → PostDetail (loader fetches a single post by id)
//   *           → NotFound
//
// Key things to notice:
//   1. The route definition owns the fetch — the component only reads results.
//   2. getLoaderHandle<Post[]>() gives a fully typed handle, .value is Post[] | undefined.
//   3. Navigating while a load is in-flight auto-cancels the previous request
//      because event.track uses the same '__loader' name each time.
//   4. The handle is reactive in setup scope — no commit(), no local state.

import {} from "auwla/jsx-runtime"
import { createMemoApp } from "auwla"
import {
  Router,
  defineRoutes,
  getLoaderHandle,
  getParams,
  back,
} from "auwla/router"

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface Post {
  id: number
  userId: number
  title: string
  body: string
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

defineRoutes([
  {
    path: "/",
    component: Home,
  },
  {
    path: "/posts",
    // The loader runs before the component renders. The signal is wired to an
    // AbortController so navigating away cancels the in-flight request.
    loader: (_, signal) =>
      fetch("https://jsonplaceholder.typicode.com/posts?_limit=15", { signal })
        .then((r) => r.json()),
    component: PostList,
  },
  {
    path: "/posts/:id",
    loader: (ctx, signal) =>
      fetch(`https://jsonplaceholder.typicode.com/posts/${ctx.params.id}`, { signal })
        .then((r) => r.json()),
    component: PostDetail,
  },
  {
    path: "*",
    component: NotFound,
  },
])

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Home() {
  return () => (
    <div>
      <h1 class="page-title">Router Loader API</h1>
      <p class="page-sub">
        Data is fetched at the route level, not inside components.
        Navigate away while loading — the previous request cancels automatically.
      </p>
      <div class="card">
        <a href="/posts">Browse posts →</a>
      </div>
    </div>
  )
}

function PostList() {
  // Type parameter tells TypeScript that .value is Post[] | undefined.
  // No runtime cost — it's purely a type-level assertion about what the loader returns.
  const loader = getLoaderHandle<Post[]>()

  return () => {
    if (loader?.pending) {
      return (
        <div>
          <div class="loader-bar" />
          <div class="status-badge pending">Loading posts…</div>
        </div>
      )
    }

    if (loader?.rejected) {
      return (
        <div class="status-badge error">
          Failed to load posts — {String(loader.reason)}
        </div>
      )
    }

    // .value is Post[] | undefined — the ?? [] ensures the list is always an array
    const posts = loader?.value ?? []

    return (
      <div>
        <h1 class="page-title">Posts</h1>
        <p class="page-sub">{posts.length} posts loaded</p>
        <div class="card">
          <ul class="post-list">
            {posts.map((post) => (
              <li key={post.id}>
                <a href={`/posts/${post.id}`}>{post.title}</a>
                <p class="meta">Post #{post.id} · User {post.userId}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
}

function PostDetail() {
  // Single post — the loader returns one Post object
  const loader = getLoaderHandle<Post>()
  const { id } = getParams()

  return () => {
    if (loader?.pending) {
      return (
        <div>
          <div class="loader-bar" />
          <div class="status-badge pending">Loading post #{id}…</div>
        </div>
      )
    }

    if (loader?.rejected) {
      return (
        <div class="status-badge error">
          Failed to load post — {String(loader.reason)}
        </div>
      )
    }

    // .value is Post | undefined after the load resolves
    const post = loader?.value

    if (!post) return <div class="status-badge error">Post not found</div>

    return (
      <div>
        <a class="back-btn" href="/posts">← Back to posts</a>
        <div class="card">
          <h1 class="detail-title">{post.title}</h1>
          <p class="detail-body">{post.body}</p>
        </div>
        <div class="card">
          <p class="page-sub">Post #{post.id} · User {post.userId}</p>
        </div>
      </div>
    )
  }
}

function NotFound() {
  return () => (
    <div class="not-found">
      <span>404</span>
      <p>Page not found</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

function App() {
  return () => (
    <div class="shell">
      <nav>
        <span class="brand">auwla</span>
        <a href="/">Home</a>
        <a href="/posts">Posts</a>
      </nav>
      <main>
        <Router />
      </main>
    </div>
  )
}

createMemoApp(document.getElementById("app")!, <App />)
