import { h } from '../jsx'
import { composeRoutes, group, defineRoutes } from '../index'
import { AppLayout } from './layouts/AppLayout'
import { HomePage } from './pages/Home'
import { LandingPage } from './pages/Landing'
import { PerfDemo } from './pages/PerfDemo'
import { DevToolsDemo } from './pages/DevToolsDemo'
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
    { path: '/perf', component: () => <PerfDemo />, name: 'perf' },
    { path: '/devtools', component: () => <DevToolsDemo />, name: 'devtools' }
  ])
))

// Admin routes grouped under /admin with guard and shared layout
export const adminGrouped = group('/admin', { guard: adminGuard, layout: AppLayout }, adminRoutes)

// All routes composed
export const allRoutes = composeRoutes(baseRoutes, appGrouped, adminGrouped)