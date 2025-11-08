import { defineRoutes } from '../../src/index'
import { UserPage } from './pages/UserPage'

export const routes = defineRoutes([
  { path: '/', component:()=> <UserPage/>, name: 'user' },
])