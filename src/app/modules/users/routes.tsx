import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { UsersList } from './UsersList'
import { UserDetail } from './UserDetail'

export const usersRoutes = defineRoutes([
  { 
    path: '/users', 
    component: () => <UsersList />, 
    name: 'users-list',
    meta: {
      title: 'Users - Auwla App',
      description: 'Browse and manage user accounts',
      keywords: 'users, accounts, management'
    }
  },
  { 
    path: '/users/:id', 
    component: () => <UserDetail />, 
    name: 'user-detail',
    meta: {
      title: (params) => `User ${params.id} - Auwla App`,
      description: (params) => `View detailed information for user ${params.id}`,
      keywords: 'user, profile, details'
    }
  },
])