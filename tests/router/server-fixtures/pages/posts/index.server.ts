export async function getPosts(): Promise<{ id: number; title: string }[]> {
  return []
}

export const createPost = remote.post([validate(schema)], async (ctx: any, data: { title: string }): Promise<{ id: number }> => {
  return { id: 1 }
})
