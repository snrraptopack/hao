import { defineMiddleware } from 'auwla/server'

export type User = {
  id: string
  name: string
  role: 'user' | 'admin'
}

export type Post = {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: string
}

export const users: User[] = [
  { id: 'u1', name: 'Ada Admin', role: 'admin' },
  { id: 'u2', name: 'Ugo User', role: 'user' },
]

export const posts: Post[] = [
  {
    id: '1',
    title: 'Hello Auwla',
    content: 'This is the first post, seeded by the shared server database.',
    authorId: 'u1',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'File-based routing',
    content: 'Routes are generated from the pages directory automatically.',
    authorId: 'u2',
    createdAt: new Date().toISOString(),
  },
]

export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getPostById(id: string): Post | undefined {
  return posts.find((p) => p.id === id)
}

export function getPostsByAuthor(authorId: string): Post[] {
  return posts.filter((p) => p.authorId === authorId)
}

export function createPost(input: { title: string; content: string }, authorId: string): Post {
  const post: Post = {
    id: String(Date.now()),
    title: input.title.trim(),
    content: input.content.trim(),
    authorId,
    createdAt: new Date().toISOString(),
  }
  posts.push(post)
  return post
}

export function updatePost(
  id: string,
  input: { title?: string; content?: string },
  userId: string,
): Post {
  const post = posts.find((p) => p.id === id)
  if (!post) throw new Error('Post not found')
  if (post.authorId !== userId) throw new Error('Forbidden')
  if (input.title !== undefined) post.title = input.title.trim()
  if (input.content !== undefined) post.content = input.content.trim()
  return post
}

export function deletePost(id: string, userId: string): void {
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Post not found')
  if (posts[index]!.authorId !== userId) throw new Error('Forbidden')
  posts.splice(index, 1)
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id)
}

/**
 * A tiny logging middleware used by shared server modules to prove middleware
 * composition works outside of page-scoped files.
 */
export const logMiddleware = defineMiddleware(async (ctx, next) => {
  const start = Date.now()
  const result = await next()
  console.log(`[db] ${ctx.request.method} ${ctx.route.path ?? '-'} took ${Date.now() - start}ms`)
  return result
})
