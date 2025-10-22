// Auto-generated route registry
// This file is automatically updated when you run 'npm run routes:generate'

export interface RouteDefinition {
  path: string
  component: (params?: any, query?: any) => HTMLElement
  name: string
  meta?: Record<string, any>
}

// --- AUTO-GENERATED IMPORTS START ---
import AboutPage from './about'
import MixPage from './mix'
// --- AUTO-GENERATED IMPORTS END ---

// Manual routes (add your custom routes here)
const manualRoutes: RouteDefinition[] = []

// --- AUTO-GENERATED ROUTES START ---
const generatedRoutes: RouteDefinition[] = [
  {
    path: '/',
    component: () => AboutPage(), // Default to about page for now
    name: 'home'
  },
  {
    path: '/about',
    component: AboutPage,
    name: 'about'
  },
  {
    path: '/mix',
    component: MixPage,
    name: 'mix'
  }
]
// --- AUTO-GENERATED ROUTES END ---

// Export all routes
export const routes: RouteDefinition[] = [
  ...manualRoutes,
  ...generatedRoutes
]

export default routes
