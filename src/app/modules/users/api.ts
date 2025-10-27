import { fetch, type FetchState } from '../../../fetch'
import { type Ref } from '../../../state'

export type User = { id: number; name: string; email: string; username: string }

export function listUsers(): FetchState<User[]> {
  return fetch<User[]>('https://jsonplaceholder.typicode.com/users', { cacheKey: 'users' })
}

export function getUser(id: Ref<string>): FetchState<User> {
  return fetch<User>(() => `https://jsonplaceholder.typicode.com/users/${id.value}`,
    { cacheKey: `user_${id.value}` }
  )
}