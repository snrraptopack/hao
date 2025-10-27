import { fetch, type FetchState } from '../../../fetch'
import { type Ref } from '../../../state'

export type Post = { id: number; userId: number; title: string; body: string }

// List posts, optionally filtered by a userId ref
export function listPosts(userId?: Ref<string | undefined>): FetchState<Post[]> {
  const url = () => {
    const uid = userId ? userId.value : undefined
    return uid
      ? `https://jsonplaceholder.typicode.com/posts?userId=${encodeURIComponent(String(uid))}`
      : 'https://jsonplaceholder.typicode.com/posts?_limit=20'
  }
  return fetch<Post[]>(url)
}

// Get a single post by id ref
export function getPost(id: Ref<string>): FetchState<Post> {
  return fetch<Post>(() => `https://jsonplaceholder.typicode.com/posts/${id.value}`,
    { cacheKey: `post_${id.value}` }
  )
}