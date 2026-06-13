import { getParams } from 'auwla/server'

export async function getPost(): Promise<{ id: string; title: string }> {
  const { id } = getParams()
  return { id, title: 'Hello' }
}
