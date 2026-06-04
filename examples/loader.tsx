// loader.tsx — demonstrates the router loader API with typed getLoaderHandle<T>()

import {} from "auwla/jsx-runtime"
import {
  getLoaderHandle,
  getParams,
  back,
  RouteComponent
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
// Routes (relative — group('/loader') will prefix them)
// ---------------------------------------------------------------------------

export const loaderRoutes = [
  {
    path: "/",
    component: Home,
  },
  {
    path: "/posts",
    loader: (_context: { params: Record<string, string> }, signal: AbortSignal) =>
      fetch("https://jsonplaceholder.typicode.com/posts?_limit=15", { signal })
        .then((r) => r.json()),
    component: PostList,
  },
  {
    path: "/posts/:id",
    loader: (ctx: { params: Record<string, string> }, signal: AbortSignal) =>
      fetch(`https://jsonplaceholder.typicode.com/posts/${ctx.params.id}`, { signal })
        .then((r) => r.json()),
    component: PostDetail,
  },
  {
    path: "*",
    component: NotFound,
  },
]

// ---------------------------------------------------------------------------
// Layout shell
// ---------------------------------------------------------------------------

export function LoaderShell(Child:RouteComponent) {
  return () => (
    <div class="loader-example">
      <div class="shell">
        <nav>
          <span class="brand">auwla</span>
          <a href="/loader">Home</a>
          <a href="/loader/posts">Posts</a>
        </nav>
        <main>
          <Child/>
        </main>
      </div>
    </div>
  )
}

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
        <a href="/loader/posts">Browse posts →</a>
      </div>
    </div>
  )
}

function PostList() {
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

    const posts = loader?.value ?? []

    return ()=> (
      <div>
        <h1 class="page-title">Posts</h1>
        <p class="page-sub">{posts.length} posts loaded</p>
        <div class="card">
          <ul class="post-list">
            {posts.map((post) => (
              <li key={post.id}>
                <a href={`/loader/posts/${post.id}`}>{post.title}</a>
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
  const loader = getLoaderHandle<Post>()
  const { id } = getParams()


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

  const post = loader?.value

  if (!post) return <div class="status-badge error">Post not found</div>


  return ()=>(
      <div>
        <a class="back-btn" href="/loader/posts">← Back to posts</a>
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

function NotFound() {
  return () => (
    <div class="not-found">
      <span>404</span>
      <p>Page not found</p>
    </div>
  )
}
