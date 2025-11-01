import { h } from '../jsx'
import { composeRoutes, group, defineRoutes } from '../index'
import { AppLayout } from './layouts/AppLayout'
import { HomePage } from './pages/Home'
import { LandingPage } from './pages/Landing'
import { PerfDemo } from './pages/PerfDemo'
import { DevToolsDemo } from './pages/DevToolsDemo'
import { RouteScopeDemo } from './pages/RouteScopeDemo'
import { getRouter } from '../router'
import { usersRoutes } from './modules/users/routes'
import { postsRoutes } from './modules/posts/routes'
import { adminRoutes } from './modules/admin/routes'
import { adminGuard } from './modules/admin/guard'
import { SearchPage } from './modules/search/SearchPage'

// Base route at '/'
export const baseRoutes = defineRoutes([
  { path: '/', component: () => <LandingPage />, name: 'landing' },
])

// App feature routes grouped under /app with shared layout
export const appGrouped = group('/app', { layout: AppLayout }, composeRoutes(
  defineRoutes([{ path: '/home', component: () => <HomePage /> }]),
  usersRoutes,
  postsRoutes,
  defineRoutes([
    { path: '/search', component: () => <SearchPage />, name: 'search' },
    {
      path: '/route-scope-demo',
      component: () => <RouteScopeDemo />, 
      name: 'route-scope-demo',
      prefetch: async (_params, _query, router) => {
        try {
          const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5')
          const json = await res.json()
          const items = (json as any[]).map((p) => ({ id: p.id, title: p.title }))
          // Write to router.state so createResource(key, ..., { scope: 'route' }) boots instantly
          const r = router || getRouter()
          if (r) {
            r.state['route-scope-demo:items'] = items
          }
        } catch (e) {
          console.warn('Route prefetch failed:', e)
        }
      }
    },
    { path: '/perf', component: () => <PerfDemo />, name: 'perf' },
    { path: '/devtools', component: () => <DevToolsDemo />, name: 'devtools' }
  ])
))

// Admin routes grouped under /admin with guard and shared layout
export const adminGrouped = group('/admin', { guard: adminGuard, layout: AppLayout }, adminRoutes)

// All routes composed
export const allRoutes = composeRoutes(baseRoutes, appGrouped, adminGrouped)