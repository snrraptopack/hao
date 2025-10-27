# Chapter 6 — Routing Basics

Pages are components. Define routes, read params, and navigate.

## Define Routes
```tsx
// src/app/routes.tsx
import { h } from '../jsx'
import { defineRoutes } from '../router'
import { AppLayout } from './layouts/AppLayout'
import { HomePage } from './pages/HomePage'
import { PostsList } from './modules/posts/PostsList'
import { PostDetail } from './modules/posts/PostDetail'

export const routes = defineRoutes([
  {
    path: '/',
    layout: AppLayout,
    children: [
      { path: '', component: HomePage },
      { path: 'posts', component: PostsList },
      { path: 'posts/:id', component: PostDetail },
    ],
  },
])
```

## Read Params
```tsx
import { h } from '../../src/jsx'
import { useParams } from '../../src/router'

export function PostIdEcho(): HTMLElement {
  const params = useParams()
  return <div>Post ID: {params.value.id}</div>
}
```
- `useParams()` returns a `Ref` of `{ [key: string]: string }` matching `:segments`.

## Links
```tsx
import { Link } from '../../src/router'

export function Nav(): HTMLElement {
  return (
    <nav class="space-x-3">
      {Link({ to: '/', text: 'Home' })}
      {Link({ to: '/posts', text: 'Posts' })}
    </nav>
  )
}
```

## Exercise
- Add a dynamic route with `:userId` and render it.
- Create a small nav and navigate between pages.

## Checklist
- [ ] You created nested routes with a layout.
- [ ] You read params with `useParams`.
- [ ] You rendered router `Link`s.