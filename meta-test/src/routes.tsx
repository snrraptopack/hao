import { defineRoutes, group,composeRoutes } from '../../src/index'
import { UserPage } from './pages/UserPage'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'


const publicRoutes = defineRoutes([
  { path: '/', component: () => <UserPage />, name: 'user' },
])

const authRoutes = defineRoutes([
  { path: '/dashboard', component: () => <DashboardPage />, name: 'dashboard' },
  { path: '/settings', component: () => <SettingsPage />, name: 'settings' },
])

export const routes = composeRoutes(publicRoutes,group('/', { layout: AuthLayout }, authRoutes))
