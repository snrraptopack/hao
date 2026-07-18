/**
 * @fileoverview Node http ↔ Fetch API shims shared by server integrations.
 *
 * `nodeRequestToRequest` converts an `IncomingMessage` (streaming body) into
 * a WinterCG `Request`; `sendNodeResponse` pumps a WinterCG `Response` back
 * onto a `ServerResponse`. Used by the Express adapter today and intended to
 * replace the duplicated inline shims in the Vite plugins (see M6).
 */

import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Convert a Node `IncomingMessage` to a WinterCG `Request`.
 * The body is streamed (`duplex: 'half'`) rather than buffered, so large
 * uploads are not held in memory. GET/HEAD requests never carry a body.
 */
export async function nodeRequestToRequest(req: IncomingMessage): Promise<Request> {
  const protocol = (req.socket as { encrypted?: boolean } | undefined)?.encrypted ? 'https' : 'http'
  const host = req.headers.host ?? 'localhost'
  const url = `${protocol}://${host}${req.url ?? '/'}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const method = req.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers })
  }

  const body = Readable.toWeb(req) as ReadableStream
  return new Request(url, { method, headers, body, duplex: 'half' } as RequestInit)
}

/** Pump a WinterCG `Response` onto a Node `ServerResponse`. */
export async function sendNodeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  const reader = response.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
    res.end()
  } catch (error) {
    res.destroy(error as Error)
  }
}
