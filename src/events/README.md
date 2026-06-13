> This directory contains Auwla's event and async primitives. `track` is the core async lifecycle primitive; this README documents its fullstack remote-function extensions.

# `track` — local async work and remote functions

## Local tracks (existing)

```ts
import { track } from 'auwla'

const data = track('loadPosts', async (signal) => {
  const res = await fetch('/api/posts', { signal })
  return res.json()
})

// In render:
// data.pending, data.resolved, data.rejected, data.value
```

## Remote queries — `track.get`

`track.get` runs a GET remote function immediately and returns a reactive `TrackHandle`.

```ts
import { track } from 'auwla'

const posts = track.get('posts.getPosts')
const post = track.get('posts.getPost')
```

The key is typed against the generated server manifest. Only keys declared as `GET` are accepted. The return type is inferred from the manifest.

Options:

```ts
const post = track.get('posts.getPost', { signal: abortController.signal })
```

## Remote commands — `track.post`

`track.post` creates a lazy command handle. Nothing is sent to the server until you call `.run()`.

```ts
import { track } from 'auwla'

const save = track.post('posts.createPost')

async function onSubmit(data: { title: string }) {
  await save.run(data)
  // save.result is now a TrackHandle with the mutation result
}
```

Render post-mutation state without a separate query:

```tsx
<button onClick={onSubmit} disabled={save.pending}>
  {save.pending ? 'Saving…' : 'Save'}
</button>

{save.result?.resolved && <p>Saved: {save.result.value.title}</p>}
```

`.run()` also accepts `FormData` for progressive-enhancement forms:

```ts
const form = new FormData(e.currentTarget)
await save.run(form)
```

## Inside `routed`

`routed` already receives `ctx` and `signal`. Use `track.get` to fetch server data during navigation:

```ts
export const routed = async (ctx, signal) => {
  const post = await track.get('posts.getPost', { signal })
  return { post }
}
```

Note: `track.get` sends the current `routePath` to the adapter so params can be extracted server-side. Do not pass params manually.
