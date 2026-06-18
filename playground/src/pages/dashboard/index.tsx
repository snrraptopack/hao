import { getRouted, Link, type RouteContext } from 'auwla/router'
import { track } from 'auwla/events'

export async function routed(_ctx: RouteContext<'/dashboard'>, signal: AbortSignal) {
  return await track.get('dashboard.getDashboard', { signal })
}

export function error() {
  return () => (
    <div class="page">
      <h1>Dashboard</h1>
      <p class="error">You must be signed in to view this page.</p>
      <Link href="/login" class="btn primary">Sign in</Link>
    </div>
  )
}

export default function DashboardPage() {
  const loader = getRouted(routed)

  if (loader?.pending) return <div class="page">Loading dashboard…</div>
  if (loader?.rejected) {
    return (
      <div class="page">
        <h1>Dashboard</h1>
        <p class="error">{String(loader.reason)}</p>
        <Link href="/login" class="btn primary">Sign in</Link>
      </div>
    )
  }

  const data = loader?.value

  return () => (
    <div class="page">
      <h1>Dashboard</h1>
      <div class="stats">
        <div class="stat card">
          <span class="stat-value">{data?.totalPosts ?? 0}</span>
          <span class="stat-label">Total posts</span>
        </div>
        <div class="stat card">
          <span class="stat-value">{data?.myPosts ?? 0}</span>
          <span class="stat-label">Your posts</span>
        </div>
        {data?.isAdmin && (
          <div class="stat card accent">
            <span class="stat-value">Admin</span>
            <span class="stat-label">Role</span>
          </div>
        )}
      </div>
      <Link href="/posts" class="btn">Browse posts</Link>
    </div>
  )
}
