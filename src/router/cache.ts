/**
 * @fileoverview Route-based caching and invalidation system.
 * 
 * Provides an effortless caching mechanism directly attached to the RouteContext.
 * Developers write to `ctx.state` and it persists across navigations based on the URL.
 * 
 * Includes powerful Tag-based invalidation to clear grouped cache entries globally.
 */

// Memory store for route states. Key is the exact resolved URL path (e.g. '/posts/123').
const routeCache = new Map<string, Record<string, any>>()

// Memory store for tags. Key is the tag string, value is a Set of exact URL paths.
const tagMap = new Map<string, Set<string>>()

/**
 * Gets or creates the persistent state object for a given path.
 * @internal
 */
export function getRouteState(path: string): Record<string, any> {
  let state = routeCache.get(path)
  if (!state) {
    state = {}
    routeCache.set(path, state)
  }
  return state
}

/**
 * Associates a tag with a given route path.
 * @internal
 */
export function tagRoute(path: string, tags: string[]): void {
  for (const tag of tags) {
    let paths = tagMap.get(tag)
    if (!paths) {
      paths = new Set()
      tagMap.set(tag, paths)
    }
    paths.add(path)
  }
}

/**
 * Internal cleanup to remove a path from all tag sets when its cache is invalidated.
 */
function cleanupTags(path: string): void {
  for (const [tag, paths] of tagMap.entries()) {
    paths.delete(path)
    if (paths.size === 0) {
      tagMap.delete(tag)
    }
  }
}

export type InvalidateOptions = {
  /** Array of tags to invalidate. Deletes cache for any route that registered these tags. */
  tags?: string[]
  /** Exact path or wildcard pattern (e.g., '/posts/*') to invalidate. */
  path?: string | RegExp
}

/**
 * Invalidates (deletes) cached state objects.
 * The next time an invalidated route is visited, its state will be fresh.
 * 
 * @example
 * // Invalidate by tag
 * invalidate({ tags: ['posts'] })
 * 
 * // Invalidate exact path
 * invalidate({ path: '/posts/123' })
 * 
 * // Invalidate by prefix
 * invalidate({ path: '/posts/*' })
 */
export function invalidate(options: InvalidateOptions): void {
  const pathsToDelete = new Set<string>()

  // 1. Match by tags
  if (options.tags) {
    for (const tag of options.tags) {
      const paths = tagMap.get(tag)
      if (paths) {
        for (const p of paths) {
          pathsToDelete.add(p)
        }
      }
    }
  }

  // 2. Match by path or wildcard
  if (options.path) {
    if (options.path instanceof RegExp) {
      for (const p of routeCache.keys()) {
        if (options.path.test(p)) {
          pathsToDelete.add(p)
        }
      }
    } else if (typeof options.path === 'string') {
      if (options.path.endsWith('/*')) {
        const prefix = options.path.slice(0, -2)
        for (const p of routeCache.keys()) {
          if (p === prefix || p.startsWith(prefix + '/')) {
            pathsToDelete.add(p)
          }
        }
      } else {
        pathsToDelete.add(options.path)
      }
    }
  }

  // 3. Delete from cache and cleanup tags
  for (const path of pathsToDelete) {
    routeCache.delete(path)
    cleanupTags(path)
  }
}
