import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { AdminPage } from './AdminPage'

export const adminRoutes = defineRoutes([
  { path: '/dashboard', component: () => <AdminPage /> },
])