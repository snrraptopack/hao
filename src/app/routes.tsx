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
import { App as SimpleApp } from './pages/Simple'
import { App as PortalDemoApp } from './pages/PortalDemo'


// Base route at '/'
export const baseRoutes = defineRoutes([
  { 
    path: '/', 
    component: () => <LandingPage />, 
    name: 'landing',
    meta: {
      title: 'Welcome to Auwla',
      description: 'A lightweight, modular JavaScript framework for building modern web applications',
      keywords: 'auwla, framework, spa, javascript, typescript'
    }
  },
])

// App feature routes grouped under /app with shared layout
export const appGrouped = group('/app', { layout: AppLayout }, composeRoutes(
  defineRoutes([{ 
    path: '/home', 
    component: () => <HomePage />,
    meta: {
      title: 'Home - Auwla App',
      description: 'Welcome to Auwla modular application demonstrating routing, state management, and data fetching',
      keywords: 'home, dashboard, auwla'
    }
  }]),
  usersRoutes,
  postsRoutes,
  defineRoutes([
    { 
      path: '/search', 
      component: () => <SearchPage />, 
      name: 'search',
      meta: {
        title: 'Search - Auwla App',
        description: 'Search through content with reactive query parameters',
        keywords: 'search, query, filter'
      }
    },
    {
      path: '/route-scope-demo',
      component: () => <RouteScopeDemo />, 
      name: 'route-scope-demo',
      meta: {
        title: 'Route Scope Demo - Auwla App',
        description: 'Demonstration of route-scoped resource caching and prefetching',
        keywords: 'demo, routing, cache, prefetch'
      },
      prefetch: async (_params, _query, router) => {
        try {
          const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=30')
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
    { 
      path: '/perf', 
      component: () => <PerfDemo />, 
      name: 'perf',
      meta: {
        title: 'Performance Demo - Auwla App',
        description: 'Performance benchmarking and optimization demonstrations',
        keywords: 'performance, benchmark, optimization'
      }
    },
    { 
      path: '/devtools', 
      component: () => <DevToolsDemo />, 
      name: 'devtools',
      meta: {
        title: 'DevTools Demo - Auwla App',
        description: 'Developer tools integration and debugging features',
        keywords: 'devtools, debugging, development'
      }
    }
  ])
))

// Admin routes grouped under /admin with guard and shared layout
export const adminGrouped = group('/admin', { guard: adminGuard, layout: AppLayout }, adminRoutes)

const simple = defineRoutes([
  {
    path:"/simple",
    component: SimpleApp,
    name:"simple"
  },
  {
    path:"/portal-demo",
    component: PortalDemoApp,
    name:"portal-demo",
    meta: {
      title: 'Portal Demo - Auwla',
      description: 'Demonstration of Portal component for modals, tooltips, and dropdowns',
      keywords: 'portal, modal, tooltip, dropdown'
    }
  },
])

// All routes composed
export const allRoutes = composeRoutes(baseRoutes, appGrouped, adminGrouped, simple)