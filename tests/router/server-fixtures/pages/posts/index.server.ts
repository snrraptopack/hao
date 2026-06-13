export async function getPosts(): Promise<{ id: number; title: string }[]> {
  return []
}

export const createPost = remote.post([validate(schema)], async (data: { title: string }): Promise<{ id: number }> => {
  return { id: 1 }
})
