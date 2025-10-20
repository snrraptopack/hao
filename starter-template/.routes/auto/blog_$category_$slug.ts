// Auto-generated route file
import { RouteConfig } from 'auwla'

const route: RouteConfig = {
  path: '/blog/:category/:slug',
  component: () => import('../../src/pages/blog-post.auwla')
}

export default route
