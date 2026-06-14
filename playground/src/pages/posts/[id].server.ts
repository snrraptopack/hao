import { remote, getParams } from 'auwla/server'

const posts = [
  { id: '1', title: 'Hello Auwla' },
  { id: '2', title: 'File-based routing' },
]

export const getPost = remote.get(
  async (): Promise<{ id: string; title: string } | null> => {
    const { id } = getParams()
    return posts.find((post) => post.id === id) ?? null
  },
)
