import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { AdminPage } from './AdminPage'

export const adminRoutes = defineRoutes([
  { 
    path: '/dashboard', 
    component: () => <AdminPage />, 
    name: 'admin-dashboard',
    meta: {
      title: 'Admin Dashboard - Auwla App',
      description: 'Administrative dashboard for managing application settings and users',
      keywords: 'admin, dashboard, management, settings'
    }
  },
])