/**
 * @fileoverview Scanner for Auwla server-only `.server.ts` files.
 *
 * Walks the pages directory (and optionally src/server) and produces a list
 * of server module descriptors. Each descriptor contains the route name,
 * params type, and exported remote functions discovered in the file.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { RemoteMethod } from '../server/types'

/** Extensions recognised as server files. */
export const SERVER_EXTENSIONS = ['.server.ts', '.server.tsx', '.server.js', '.server.jsx']

/**
 * A single exported remote function inside a server module.
 */
export interface ServerExport {
  /** Export name, e.g. "getPosts". */
  name: string
  /** Declared HTTP method. Plain functions default to GET. */
  method: RemoteMethod
  /** Type strings for each positional argument. */
  argsType: string[]
  /** Type string for the resolved return value. */
  returnType: string
}

/**
 * Descriptor for one `.server.ts` file.
 */
export interface ServerModule {
  /** Absolute path to the server file. */
  filePath: string
  /** Relative path from the scanned root. */
  relativePath: string
  /**
   * Dot-notation route name used as the prefix for remote keys.
   *   src/pages/posts/index.server.ts        → "posts"
   *   src/pages/posts/[id].server.ts         → "posts"
   *   src/pages/posts/[id]/comments.server.ts → "posts.comments"
   *   src/pages/about.server.ts              → "about"
   *   src/server/auth.server.ts              → "auth"
   *   src/server/billing/invoice.server.ts   → "billing.invoice"
   */
  routeName: string
  /**
   * URL route pattern used by the adapter to extract params.
   *   src/pages/posts/index.server.ts        → "/posts"
   *   src/pages/posts/[id].server.ts         → "/posts/:id"
   *   src/pages/posts/[...slug].server.ts    → "*"
   *   src/pages/about.server.ts              → "/about"
   *   src/server/auth.server.ts              → ""
   */
  routePattern: string
  /**
   * Ordered param names extracted from the route pattern.
   * Examples: ["id"], ["category", "id"], ["slug"], []
   */
  params: string[]
  /** Generated TypeScript type string for route params. */
  paramsType: string
  /** Discovered remote function exports. */
  exports: ServerExport[]
}

/**
 * Scan `pagesDir` and `serverDir` for `.server.ts` files and return descriptors.
 *
 * @param pagesDir Absolute path to the pages directory (e.g. src/pages).
 * @param serverDir Absolute path to the server directory (e.g. src/server), or null to skip.
 */
export function scanServerModules(
  pagesDir: string,
  serverDir: string | null,
): ServerModule[] {
  const collected: ServerModule[] = []

  if (pagesDir) collectModules(pagesDir, pagesDir, true, collected)
  if (serverDir) collectModules(serverDir, serverDir, false, collected)

  return collected
}

function collectModules(
  rootDir: string,
  currentDir: string,
  isPages: boolean,
  result: ServerModule[],
): void {
  let entries: string[]
  try {
    entries = readdirSync(currentDir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      collectModules(rootDir, fullPath, isPages, result)
      continue
    }

    const ext = SERVER_EXTENSIONS.find((e) => entry.endsWith(e))
    if (!ext) continue

    const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/')
    const source = readFileSync(fullPath, 'utf-8')

    const routeName = isPages
      ? filePathToRouteName(relativePath)
      : filePathToServerRouteName(relativePath)
    const routePattern = isPages
      ? filePathToRoutePattern(relativePath)
      : ''
    const params = isPages
      ? filePathToParams(relativePath)
      : []
    const paramsType = isPages
      ? filePathToParamsType(relativePath)
      : 'Record<string, never>'

    const exports = extractServerExports(source)
    if (exports.length === 0) continue

    result.push({ filePath: fullPath, relativePath, routeName, routePattern, params, paramsType, exports })
  }
}

/**
 * Convert a pages-relative server file path into a dot-notation route name.
 *
 * Examples:
 *   posts/index.server.ts        → "posts"
 *   posts/[id].server.ts         → "posts"
 *   posts/[id]/comments.server.ts → "posts.comments"
 *   about.server.ts              → "about"
 */
export function filePathToRouteName(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const parts = withoutExt.split('/')

  const segments: string[] = []
  for (const part of parts) {
    if (part === 'index') continue
    // Ignore dynamic/catch-all segments for the route name.
    if (/^\[/.test(part)) continue
    segments.push(part)
  }

  return segments.join('.') || 'index'
}

/**
 * Convert a server-dir-relative file path into a dot-notation route name.
 *
 * Examples:
 *   auth.server.ts             → "auth"
 *   billing/invoice.server.ts  → "billing.invoice"
 */
export function filePathToServerRouteName(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  return withoutExt.replace(/\//g, '.')
}

/**
 * Convert a pages-relative server file path into a URL route pattern.
 *
 * Examples:
 *   index.server.ts              → "/"
 *   about.server.ts              → "/about"
 *   posts/index.server.ts        → "/posts"
 *   posts/[id].server.ts         → "/posts/:id"
 *   posts/[id]/comments.server.ts → "/posts/:id/comments"
 *   posts/[...slug].server.ts    → "*"
 */
export function filePathToRoutePattern(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const segments = withoutExt.split('/')

  const routeSegments: string[] = []
  for (const segment of segments) {
    if (/^\[\.\.\./.test(segment)) {
      routeSegments.push('*')
      return routeSegments.length === 0
        ? '/*'
        : '/' + routeSegments.join('/')
    }
    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    if (dynamicMatch) {
      routeSegments.push(`:${dynamicMatch[1]}`)
      continue
    }
    if (segment === 'index') {
      continue
    }
    routeSegments.push(segment)
  }

  return routeSegments.length === 0 ? '/' : '/' + routeSegments.join('/')
}

/**
 * Generate a TypeScript params type from a pages-relative server file path.
 *
 * Examples:
 *   posts/[id].server.ts         → "{ id: string }"
 *   posts/[...slug].server.ts    → "{ slug: string[] }"
 *   posts/[category]/[id].server.ts → "{ category: string; id: string }"
 *   posts/index.server.ts        → "Record<string, never>"
 */
export function filePathToParamsType(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const parts = withoutExt.split('/')

  const fields: string[] = []
  for (const part of parts) {
    const spreadMatch = part.match(/^\[\.\.\.([^\]]+)\]$/)
    if (spreadMatch) {
      fields.push(`${spreadMatch[1]}: string[]`)
      continue
    }
    const paramMatch = part.match(/^\[([^\]]+)\]$/)
    if (paramMatch) {
      fields.push(`${paramMatch[1]}: string`)
    }
  }

  if (fields.length === 0) return 'Record<string, never>'
  return `{ ${fields.join('; ')} }`
}

/**
 * Extract ordered param names from a pages-relative server file path.
 *
 * Examples:
 *   posts/[id].server.ts         → ["id"]
 *   posts/[...slug].server.ts    → ["slug"]
 *   posts/[category]/[id].server.ts → ["category", "id"]
 *   posts/index.server.ts        → []
 */
export function filePathToParams(relativePath: string): string[] {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const parts = withoutExt.split('/')

  const params: string[] = []
  for (const part of parts) {
    const spreadMatch = part.match(/^\[\.\.\.([^\]]+)\]$/)
    if (spreadMatch) {
      params.push(spreadMatch[1]!)
      break
    }
    const paramMatch = part.match(/^\[([^\]]+)\]$/)
    if (paramMatch) {
      params.push(paramMatch[1]!)
    }
  }

  return params
}

/**
 * Extract exported remote functions from a server file's source.
 *
 * Detection rules:
 *   - export async function name(...) → GET
 *   - export function name(...) → GET
 *   - export const name = remote.get(...) → GET
 *   - export const name = remote.post(...) → POST
 *
 * Argument and return types are extracted heuristically from the source.
 * When extraction fails, they fall back to "unknown".
 */
export function extractServerExports(source: string): ServerExport[] {
  const exports: ServerExport[] = []

  for (const chunk of splitExportChunks(source)) {
    const fromFunction = parseFunctionExport(chunk)
    if (fromFunction) {
      exports.push(fromFunction)
      continue
    }

    const fromRemote = parseRemoteExport(chunk)
    if (fromRemote) {
      // Avoid duplicates if a function declaration was already captured.
      if (!exports.some((e) => e.name === fromRemote.name)) {
        exports.push(fromRemote)
      }
    }
  }

  return exports
}

/**
 * Split source text into individual export chunks. Each chunk starts with an
 * export keyword and ends just before the next export keyword (or EOF).
 * This prevents regexes from matching across multiple exports.
 */
function splitExportChunks(source: string): string[] {
  const exportRegex = /\bexport\s+(?:async\s+)?(?:const|function)\s+/g
  const positions: number[] = []
  let match: RegExpExecArray | null
  while ((match = exportRegex.exec(source)) !== null) {
    positions.push(match.index)
  }
  positions.push(source.length)

  const chunks: string[] = []
  for (let i = 0; i < positions.length - 1; i++) {
    chunks.push(source.slice(positions[i], positions[i + 1]))
  }
  return chunks
}

/**
 * Parse a function declaration export chunk.
 * Supports return types that contain generic syntax and inline object types.
 */
function parseFunctionExport(chunk: string): ServerExport | null {
  const headMatch = chunk.match(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/)
  if (!headMatch) return null

  const name = headMatch[1]!
  let idx = headMatch.index! + headMatch[0].length

  const argsResult = extractBalanced(chunk, idx, '(', ')')
  if (!argsResult) return null
  const argsSource = argsResult.content
  idx = argsResult.endIdx

  // Skip whitespace. Optional return type follows.
  while (idx < chunk.length && /\s/.test(chunk[idx]!)) idx++

  let returnType = 'unknown'
  if (chunk[idx] === ':') {
    idx++
    while (idx < chunk.length && /\s/.test(chunk[idx]!)) idx++
    const typeStart = idx

    // Find the function body opening brace, ignoring braces inside <...>.
    let angleDepth = 0
    while (idx < chunk.length) {
      const ch = chunk[idx]
      if (ch === '<') {
        angleDepth++
      } else if (ch === '>') {
        angleDepth--
      } else if (ch === '{' && angleDepth === 0) {
        break
      }
      idx++
    }

    returnType = chunk.slice(typeStart, idx).trim()
  }

  return {
    name,
    method: 'GET',
    argsType: extractArgTypes(argsSource),
    returnType: unwrapPromise(returnType),
  }
}

/**
 * Parse a remote.get / remote.post variable export chunk.
 */
function parseRemoteExport(chunk: string): ServerExport | null {
  const headMatch = chunk.match(/export\s+const\s+(\w+)\s*=\s*remote\.(get|post)\s*\(/)
  if (!headMatch) return null

  const name = headMatch[1]!
  const method = headMatch[2]!.toUpperCase() as RemoteMethod
  let idx = headMatch.index! + headMatch[0].length

  // Skip middleware array / first argument and locate the async handler.
  const handlerStart = chunk.indexOf('async', idx)
  if (handlerStart === -1) return null

  const parenOpen = chunk.indexOf('(', handlerStart)
  if (parenOpen === -1) return null

  const argsResult = extractBalanced(chunk, parenOpen + 1, '(', ')')
  if (!argsResult) return null
  const argsSource = argsResult.content
  idx = argsResult.endIdx

  // Skip whitespace and optional return type.
  while (idx < chunk.length && /\s/.test(chunk[idx]!)) idx++
  let returnType = 'unknown'
  if (chunk[idx] === ':') {
    idx++
    while (idx < chunk.length && /\s/.test(chunk[idx]!)) idx++
    const typeStart = idx
    let depth = 0
    while (idx < chunk.length) {
      const ch = chunk[idx]
      if (ch === '(' || ch === '<' || ch === '{') depth++
      else if (ch === ')' || ch === '>' || ch === '}') {
        if (depth === 0) break
        depth--
      } else if ((ch === ';' || ch === '\n' || ch === '=' || ch === '-') && depth === 0) {
        // Stop before `=>` or body `{`
        break
      }
      idx++
    }
    returnType = chunk.slice(typeStart, idx).trim()
  }

  return {
    name,
    method,
    argsType: extractArgTypes(argsSource),
    returnType: unwrapPromise(returnType),
  }
}

/**
 * Extract the content between balanced open/close characters starting at
 * `startIdx` (which should point just after the opening character).
 */
function extractBalanced(
  source: string,
  startIdx: number,
  openChar: string,
  closeChar: string,
): { content: string; endIdx: number } | null {
  let depth = 1
  let idx = startIdx
  const contentStart = startIdx

  while (idx < source.length && depth > 0) {
    const ch = source[idx]
    if (ch === openChar) depth++
    else if (ch === closeChar) depth--
    idx++
  }

  if (depth !== 0) return null
  return { content: source.slice(contentStart, idx - 1), endIdx: idx }
}

/**
 * Split a parameter list source string into individual type strings.
 *
 * "id: string, limit?: number" → ["string", "number | undefined"]
 */
function extractArgTypes(argsSource: string): string[] {
  if (!argsSource.trim()) return []

  const args: string[] = []
  const parts = argsSource.split(',').map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    // Strip destructuring and default values; keep the type annotation.
    const typeMatch = part.match(/:\s*([\s\S]+)$/) ?? part.match(/\?\s*:\s*([\s\S]+)$/)
    if (typeMatch) {
      let type = typeMatch[1]!.trim()
      if (part.includes('?') && !type.startsWith('(')) {
        type = `${type} | undefined`
      }
      args.push(type)
    } else {
      args.push('unknown')
    }
  }

  return args
}

/**
 * Strip a wrapping Promise<T> if present.
 */
function unwrapPromise(type: string): string {
  const trimmed = type.trim()
  const match = trimmed.match(/^Promise<(.+)>$/)
  return match ? match[1]!.trim() : trimmed
}
