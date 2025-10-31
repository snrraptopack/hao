import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { UsersList } from './UsersList'
import { UserDetail } from './UserDetail'

export const usersRoutes = defineRoutes([
  { path: '/users', component: () => <UsersList />, name: 'users-list' },
  { path: '/users/:id', component: () => <UserDetail />, name: 'user-detail' },
])