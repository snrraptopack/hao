import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { UsersList } from './UsersList'
import { UserDetail } from './UserDetail'

export const usersRoutes = defineRoutes([
  { path: '/users', component: () => <UsersList /> },
  { path: '/users/:id', component: () => <UserDetail /> },
])