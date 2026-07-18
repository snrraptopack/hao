// context.ts — route context store and public accessors.
//
// Set during each Router render pass and read by child components via the
// accessors below. Because Auwla renders depth-first and synchronously, the
// innermost Router that writes these values wins for its subtree — exactly
// what nested routing needs. They are module-level (not reactive cells)
// because child components read them during setup, not during an active
// render pass.
//
// During SSR every accessor is served from a per-request AsyncLocalStorage
// store via `globalThis.__auwla_routerStoreProvider` (installed by
// runtime/ssr.ts); on the client the module-level fallbacks are used.

import { getCurrentPath } from "./navigation"
import { normalizePath } from "./routes"
import type { TrackHandle } from "../track/core"
import type {
  RouteContext,
  RouteError,
  TypedTrackHandle,
  ValidRoutePath,
  PathParams,
} from "./types"

export interface RouterStoreProvider {
  getCurrentContext(): RouteContext | null
  setCurrentContext(ctx: RouteContext | null): void
  getCurrentLoader(): TrackHandle | null
  setCurrentLoader(loader: TrackHandle | null): void
  getCurrentMeta(): Record<string, unknown> | null
  setCurrentMeta(meta: Record<string, unknown> | null): void
  getCurrentError(): RouteError | null
  setCurrentError(error: RouteError | null): void
}

function getStoreProvider(): RouterStoreProvider | null {
  return (globalThis as any).__auwla_routerStoreProvider ?? null
}

let _currentContext: RouteContext | null = null
let _pendingContext: RouteContext | null = null
let _currentLoader: TrackHandle | null = null
let _currentMeta: Record<string, unknown> | null = null
/**
 * Set before every error component render, cleared after every normal render.
 * Readable via getRouteError() inside any error component so the component
 * can surface the reason, source, and route context without receiving props.
 */
let _currentError: RouteError | null = null

// ---------------------------------------------------------------------------
// Provider-aware read/write helpers (used by the Router component)
// ---------------------------------------------------------------------------

/** @internal */
export function readCurrentContext(): RouteContext | null {
  const provider = getStoreProvider()
  return provider ? provider.getCurrentContext() : _currentContext
}
/** @internal */
export function writeCurrentContext(ctx: RouteContext | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentContext(ctx)
  else _currentContext = ctx
}

/** @internal */
export function readPendingContext(): RouteContext | null {
  return _pendingContext
}
/** @internal */
export function writePendingContext(ctx: RouteContext | null): void {
  _pendingContext = ctx
}

/** @internal */
export function readCurrentLoader(): TrackHandle | null {
  const provider = getStoreProvider()
  return provider ? provider.getCurrentLoader() : _currentLoader
}
/** @internal */
export function writeCurrentLoader(loader: TrackHandle | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentLoader(loader)
  else _currentLoader = loader
}

/** @internal */
export function readCurrentMeta(): Record<string, unknown> | null {
  const provider = getStoreProvider()
  return provider ? provider.getCurrentMeta() : _currentMeta
}
/** @internal */
export function writeCurrentMeta(meta: Record<string, unknown> | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentMeta(meta)
  else _currentMeta = meta
}

/** @internal */
export function readCurrentError(): RouteError | null {
  const provider = getStoreProvider()
  return provider ? provider.getCurrentError() : _currentError
}
/** @internal */
export function writeCurrentError(error: RouteError | null): void {
  const provider = getStoreProvider()
  if (provider) provider.setCurrentError(error)
  else _currentError = error
}

// ---------------------------------------------------------------------------
// SSR seeding hooks (kept for the runtime/ssr.ts import surface)
// ---------------------------------------------------------------------------

/** @internal Server-side rendering hooks to seed route context. */
export function __setCurrentContext(ctx: RouteContext | null): void {
  writeCurrentContext(ctx)
}
/** @internal Server-side rendering hooks to seed the active loader handle. */
export function __setCurrentLoader(loader: TrackHandle | null): void {
  writeCurrentLoader(loader)
}
/** @internal Server-side rendering hooks to seed route meta. */
export function __setCurrentMeta(meta: Record<string, unknown> | null): void {
  writeCurrentMeta(meta)
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function getParams<P extends ValidRoutePath>(_path?: P): PathParams<P> {
  return (readCurrentContext()?.params ?? {}) as PathParams<P>
}

export function getQuery(): Record<string, string> {
  return readCurrentContext()?.query ?? {}
}

export function getLocation(): string {
  return getCurrentPath()
}

export function getLoaderHandle<T = unknown>(): TypedTrackHandle<T> | null {
  return readCurrentLoader() as TypedTrackHandle<T> | null
}

/**
 * Typed accessor for the active `routed` data handle.
 *
 * ── Typed call (recommended) ─────────────────────────────────────────────────
 * Pass the page's `routed` function. TypeScript infers the resolved data type
 * `T` from its return type — no manual generic is needed:
 *
 *   export const routed = async (ctx, signal) => ({
 *     post: await fetchPost(ctx.params.id, signal),
 *   })
 *
 *   function PostDetail() {
 *     const data = getRouted(routed)
 *     // data.value → { post: Post }  — fully inferred
 *     return () => <h1>{data?.value?.post.title}</h1>
 *   }
 *
 * ── Untyped call ─────────────────────────────────────────────────────────────
 * Omit the argument to get a handle typed as `unknown`. Useful in shared
 * utility code that doesn't know the specific route's data shape:
 *
 *   const data = getRouted()
 *   // data.value → unknown
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The function argument, when provided, is used by TypeScript for type
 * inference only — it is never called at runtime.
 *
 * Returns null when no routed function is active on the current route.
 */
export function getRouted<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- inference only
  _fn?: (ctx: RouteContext<any>, signal: AbortSignal) => Promise<T>,
): TypedTrackHandle<T> | null {
  return readCurrentLoader() as TypedTrackHandle<T> | null
}

/**
 * Returns the current error context when an error component is rendering.
 * Returns null in any other context.
 *
 * Call this in the setup of an error component (route-level or global) to
 * read the structured error regardless of whether it came from a loader or
 * another source:
 *
 *   function MyError() {
 *     const err = getRouteError()
 *     return () => (
 *       <div>
 *         <h1>Something went wrong</h1>
 *         <p>{String(err?.reason)}</p>
 *       </div>
 *     )
 *   }
 */
export function getRouteError(): RouteError | null {
  return readCurrentError()
}

export function getRouteMeta<T extends Record<string, unknown> = Record<string, unknown>>(): T {
  return (readCurrentMeta() ?? {}) as T
}

/**
 * Returns true when the current path starts with `path` at a segment boundary.
 *
 * Accepts any ValidRoutePath. When routes are registered via the Register
 * interface, only known paths are accepted at compile time.
 */
export function isActive(path: string): boolean {
  const current = normalizePath(getCurrentPath().split('?')[0]!)
  const target  = normalizePath(path)
  return current === target || current.startsWith(target + '/')
}

/**
 * Returns true only when the current path is an exact match for `path`.
 *
 * Accepts any path string.
 */
export function isExactActive(path: string): boolean {
  return normalizePath(getCurrentPath().split('?')[0]!) === normalizePath(path)
}
