import { h } from '../../../jsx'
import { defineRoutes } from '../../../index'
import { PostsList } from './PostsList'
import { PostDetail } from './PostDetail'

export const postsRoutes = defineRoutes([
  { 
    path: '/posts', 
    component: () => <PostsList />, 
    name: 'posts-list',
    meta: {
      title: 'Posts - Auwla App',
      description: 'Browse all blog posts and articles',
      keywords: 'posts, blog, articles, content'
    }
  },
  { 
    path: '/posts/:id', 
    component: () => <PostDetail />, 
    name: 'post-detail',
    meta: {
      title: (params) => `Post ${params.id} - Auwla App`,
      description: (params) => `Read the full content of post ${params.id}`,
      keywords: 'post, article, blog'
    }
  },
])