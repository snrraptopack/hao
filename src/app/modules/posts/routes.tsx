import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { PostsList } from './PostsList'
import { PostDetail } from './PostDetail'

export const postsRoutes = defineRoutes([
  { path: '/posts', component: () => <PostsList /> },
  { path: '/posts/:id', component: () => <PostDetail /> },
])