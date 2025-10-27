import { watch, type Ref } from '../../../state'
import { type Post } from './api'

// Derived ref that filters posts by a query string (case-insensitive)
export function filterPostsByQuery(posts: Ref<Post[]>, qRef: Ref<string>): Ref<Post[]> {
  return watch<[Post[], string], Post[]>([posts, qRef], ([list, q]: [Post[], string]) => {
    if (!q) return list
    const needle = q.toLowerCase()
    return list.filter((p: Post) => p.title.toLowerCase().includes(needle) || p.body.toLowerCase().includes(needle))
  }) as Ref<Post[]>
}

// Build the search path with a query param
export function buildSearchPath(value: string): string {
  const q = encodeURIComponent(value)
  return `/app/search?q=${q}`
}