import { ref, watch, type Ref, setWatchContext } from "./state";
import { isDevEnv } from "./devtools";
import { createComponentContext, setCurrentComponent, executeMountCallbacks, executeCleanup } from "./lifecycle";
// PathParams generic is defined in this module (see below)

export type RouteParams = Record<string, string | number>;
export type QueryParams = Record<string, string>;

export type RouteGuard = (to: RouteMatch, from: RouteMatch | null) => boolean | Promise<boolean>;

// Infer param names from a ":param" path pattern
type PathParamNames<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | PathParamNames<`/${Rest}`> :
  S extends `${string}:${infer P}` ? P :
  never;

// Allow numbers as well; will be URL-encoded to strings when building paths
export type PathParams<S extends string> = Record<PathParamNames<S>, string | number>;

// Helper type for building paths that may include a query string
type WithOptionalQuery<P extends string> = P | `${P}?${string}`;

export type RoutedContext = {
  state: Record<string, any>;
  params: RouteParams;
  query: QueryParams;
  prev: RouteMatch<any> | null;
  path: string;
  router: Router<any>;
}

let currentRoutedContext: RoutedContext | null = null;
export function setRoutedContext(ctx: RoutedContext | null) {
  currentRoutedContext = ctx;
}
export function getRoutedContext(): RoutedContext | null {
  return currentRoutedContext;
}

export type Route<P extends string | RegExp = string> = {
  path: P;
  component: (
    params?: P extends string ? PathParams<P> : RouteParams,
    query?: QueryParams
  ) => HTMLElement;
  name?: string;
  guard?: RouteGuard;
  layout?: (
    child: HTMLElement,
    params?: P extends string ? PathParams<P> : RouteParams,
    query?: QueryParams
  ) => HTMLElement;
  routed?: (
    state: Record<string, any>,
    params?: P extends string ? PathParams<P> : RouteParams,
    prev?: RouteMatch<any> | null
  ) => void | (() => void);
  // Optional per-param decoder/coercion
  paramDecoders?: P extends string
    ? Partial<Record<PathParamNames<P>, ParamDecoder>>
    : Record<string, ParamDecoder>;
  // Optional route-level prefetch hook for warming caches
  prefetch?: (
    params?: P extends string ? PathParams<P> : RouteParams,
    query?: QueryParams,
    router?: Router<any>
  ) => void | Promise<void>;
}

export type RouteMatch<P extends string | RegExp = string> = {
  route: Route<P>;
  params: P extends string ? PathParams<P> : RouteParams;
  query: QueryParams;
  path: string;
}

/**
 * Simple SPA Router with dynamic routes, query params, and guards.
 * 
 * @example
 * ```typescript
 * const router = new Router(document.getElementById('app')!)
 * 
 * router
 *   .add('/', () => HomePage())
 *   .add('/products', () => ProductsPage())
 *   .add('/products/:id', (params) => ProductDetailPage(params!.id))
 *   .add('/admin', () => AdminPage(), {
 *     guard: () => isAuthenticated.value
 *   })
 *   .start()
 * 
 * // Navigate programmatically
 * router.push('/products/123')
 * router.push('/products?page=2&sort=price')
 * router.back()
 * ```
 */
// Type helpers to derive names and path patterns from a routes array
type NamedRouteUnion<R extends ReadonlyArray<Route<any>>> = Extract<R[number], { name: string }>
type RegisteredName<R extends ReadonlyArray<Route<any>>> = NamedRouteUnion<R> extends { name: infer N } ? N : never
type PathForName<R extends ReadonlyArray<Route<any>>, N extends RegisteredName<R>> = Extract<R[number], { name: N }> extends { path: infer P } ? P : never

export class Router<R extends ReadonlyArray<Route<any>> = Route<any>[]> {
  private routes: Route<any>[] = []
  public currentPath: Ref<string>
  public currentParams: Ref<RouteParams>
  public currentQuery: Ref<QueryParams>
  private container: HTMLElement
  private currentMatch: RouteMatch<any> | null = null
  private routeCleanup: (() => void) | null = null
  private domObserver: MutationObserver | null = null
  // Cache compiled regex for string route patterns to avoid rebuilding on every navigation
  private compiledPatterns: Map<string, RegExp> = new Map()
  // Keep a reference to global listeners so we can clean them up
  private onPopState = () => {
    this.currentPath.value = this.stripTrailingSlash(window.location.pathname)
  }
  
  /**
   * State object for caching data across route navigations.
   * Use this to store fetched data and avoid unnecessary API calls.
   * 
   * @example
   * ```typescript
   * // Check cache before fetching
   * if (!router.state.comments) {
   *   const data = await fetch('/api/comments')
   *   router.state.comments = data
   * }
   * 
   * // Use cached data
   * commentsRef.value = router.state.comments
   * 
   * // Clear specific cache
   * delete router.state.comments
   * 
   * // Clear all cache
   * router.clearCache()
   * ```
   */
  public state: Record<string, any> = {}
  
  /**
   * Clear all cached state
   */
  clearCache() {
    this.state = {}
    if (isDevEnv()) {
      console.log('🗑️ Router cache cleared')
    }
  }
  
  /**
   * Clear specific cache key
   */
  clearCacheKey(key: string) {
    delete this.state[key]
    if (isDevEnv()) {
      console.log(`cache for: ${key}`)
    }
  }
  
  constructor(routes: R = [] as unknown as R, container?: HTMLElement) {
    // Make a mutable copy of the routes (which may be readonly if defined as a tuple)
    this.routes = [...(routes as ReadonlyArray<Route<any>>)] as Route<any>[]
    this.container = container || document.body
    this.currentPath = ref(this.stripTrailingSlash(window.location.pathname))
    this.currentParams = ref({})
    this.currentQuery = ref({})
    // Precompile regex for initial routes
    for (const r of this.routes) {
      if (typeof r.path === 'string') {
        const key = this.normalizeRoute(r.path)
        this.compiledPatterns.set(key, this.buildRegexForPattern(key))
      }
    }
    
    // Listen to browser back/forward
    window.addEventListener('popstate', this.onPopState)
    
    // Re-render on path change
    watch(this.currentPath, (path) => {
      this.render(path, this.parseQuery())
    })
  }
  
  /**
   * Add a route with optional name and guard
   * 
   * @example
   * ```typescript
   * router.add('/', () => HomePage())
   * router.add('/users/:id', (params) => UserPage(params!.id))
   * router.add('/admin', () => AdminPage(), { 
   *   guard: () => isAdmin.value 
   * })
   * ```
   */
  add<P extends string | RegExp>(
    path: P,
    component: (
      params?: P extends string ? PathParams<P> : RouteParams,
      query?: QueryParams
    ) => HTMLElement,
    options?: { name?: string; guard?: RouteGuard; layout?: (
      child: HTMLElement,
      params?: P extends string ? PathParams<P> : RouteParams,
      query?: QueryParams
    ) => HTMLElement; routed?: (
      state: Record<string, any>,
      params?: P extends string ? PathParams<P> : RouteParams,
      prev?: RouteMatch<any> | null
    ) => void | (() => void); paramDecoders?: P extends string
      ? Partial<Record<PathParamNames<P>, ParamDecoder>>
      : Record<string, ParamDecoder>; prefetch?: (
        params?: P extends string ? PathParams<P> : RouteParams,
        query?: QueryParams,
        router?: Router
      ) => void | Promise<void> }
  ) {
    this.routes.push({
      path,
      component: component as any,
      name: options?.name,
      guard: options?.guard,
      layout: options?.layout as any,
      routed: options?.routed as any,
      paramDecoders: options?.paramDecoders as any,
      prefetch: options?.prefetch as any,
    })
    return this
  }
  
  /**
   * Navigate to a path (creates history entry)
   * 
   * @example
   * ```typescript
   * router.push('/products')
   * router.push('/products/123')
   * router.push('/search?q=laptop&sort=price')
   * ```
  */
  push<P extends string>(path: WithOptionalQuery<P>) {
    if (path === this.currentPath.value) return
    window.history.pushState({}, '', path)
    this.currentPath.value = this.stripTrailingSlash(this.getPathWithoutQuery(path))
  }
  
  /**
   * Replace current path (no history entry)
   * 
   * @example
   * ```typescript
   * router.replace('/login') // Replaces current history entry
   * ```
   */
  replace<P extends string>(path: WithOptionalQuery<P>) {
    window.history.replaceState({}, '', path)
    this.currentPath.value = this.stripTrailingSlash(this.getPathWithoutQuery(path))
  }
  
  /**
   * Go back in history
   */
  back() {
    window.history.back()
  }
  
  /**
   * Go forward in history
   */
  forward() {
    window.history.forward()
  }
  
  /**
   * Navigate by route name
   * 
   * @example
   * ```typescript
   * router.add('/products/:id', ProductPage, { name: 'product-detail' })
   * router.pushNamed('product-detail', { id: '123' })
   * ```
   */
  pushNamed<N extends RegisteredName<R>>(name: N, params?: PathForName<R, N> extends string ? PathParams<PathForName<R, N>> : RouteParams) {
    const route = this.routes.find(r => r.name === (name as string))
    if (!route) {
      console.error(`Route with name "${name}" not found`)
      return
    }
    
    let path = typeof route.path === 'string' ? route.path : route.path.source
    
    // Replace params in path
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, encodeURIComponent(String(value)))
      })
    }
    
    this.push(path)
  }

  /**
   * Build a path string from a route name and params.
   * This is a typed convenience around pathFor for named routes.
   */
  pathForNamed<N extends RegisteredName<R>>(name: N, params?: PathForName<R, N> extends string ? PathParams<PathForName<R, N>> : RouteParams, query?: Record<string, string | number>): string {
    const route = this.routes.find(r => r.name === (name as string))
    if (!route) {
      throw new Error(`Route with name "${name}" not found`)
    }
    let path = typeof route.path === 'string' ? route.path : route.path.source
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, encodeURIComponent(String(value)))
      })
    }
    if (query && Object.keys(query).length > 0) {
      const qs = new URLSearchParams(
        Object.entries(query).map(([k, v]) => [k, String(v)])
      ).toString()
      return `${path}?${qs}`
    }
    return path
  }
  
  /**
   * Check if a path is currently active
   * 
   * @example
   * ```typescript
   * const isActive = router.isActive('/products')
   * ```
   */
  isActive(path: string): boolean {
    return this.currentPath.value === this.stripTrailingSlash(path)
  }
  
  private getPathWithoutQuery(fullPath: string): string {
    const parts = fullPath.split('?')
    return parts[0] || '/'
  }

  private stripTrailingSlash(p: string): string {
    if (!p) return '/'
    // Preserve root '/'; trim trailing slash for other paths
    return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
  }
  
  private parseQuery(search?: string): QueryParams {
    const queryString = search || window.location.search
    const params: QueryParams = {}
    
    if (!queryString) return params
    
    const urlParams = new URLSearchParams(queryString)
    urlParams.forEach((value, key) => {
      params[key] = value
    })
    
    return params
  }
  
  private matchRoute(path: string): RouteMatch<any> | null {
    // Try to find a matching route; string patterns use precompiled regex
    for (const route of this.routes) {
      if (typeof route.path === 'string') {
        // Case-insensitive matching with trailing-slash tolerance
        const normalizedPath = this.stripTrailingSlash(path).toLowerCase();
        const normalizedRoute = this.normalizeRoute(route.path)
        // Get or build compiled regex for this pattern
        let regex = this.compiledPatterns.get(normalizedRoute)
        if (!regex) {
          regex = this.buildRegexForPattern(normalizedRoute)
          this.compiledPatterns.set(normalizedRoute, regex)
        }
        const match = normalizedPath.match(regex)

        if (match) {
          // Decode/coerce params if decoders are present
          const rawParams = (match.groups || {}) as Record<string, string>
          const decoders = route.paramDecoders || {}
          const decodedParams: Record<string, string | number> = {}
          for (const [k, v] of Object.entries(rawParams)) {
            const d = (decoders as Record<string, ParamDecoder>)[k]
            if (!d || d === 'string') {
              decodedParams[k] = v
            } else if (d === 'number') {
              const num = Number(v)
              decodedParams[k] = Number.isNaN(num) ? (v as any) : num
            } else {
              try { decodedParams[k] = d(v) } catch { decodedParams[k] = v }
            }
          }
          return {
            route,
            params: decodedParams,
            query: this.parseQuery(),
            path
          }
        }
      } else {
        // RegExp match (leave behaviour unchanged)
        const match = path.match(route.path)
        if (match) {
          return {
            route,
            params: {},
            query: this.parseQuery(),
            path
          }
        }
      }
    }
    return null
  }

  /**
   * Prefetch by route name. If the route declares a prefetch() hook,
   * it will be invoked with the provided params and query.
   */
  async prefetchNamed<N extends RegisteredName<R>>(name: N, params?: PathForName<R, N> extends string ? PathParams<PathForName<R, N>> : RouteParams, query?: QueryParams): Promise<void> {
    const route = this.routes.find(r => r.name === (name as string))
    if (!route || !route.prefetch) return
    try {
      await route.prefetch(params as any, query, this as unknown as Router<any>)
    } catch (e) {
      if (isDevEnv()) console.warn('Prefetch error for route', name, e)
    }
  }
  
  private async render(path: string, query: QueryParams) {
    const match = this.matchRoute(path)
    
    if (!match) {
      console.error(`No route found for ${path}`)
      this.container.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <p class="text-xl text-gray-500">Page not found</p>
            <button 
              class="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              onclick="window.history.back()"
            >
              Go Back
            </button>
          </div>
        </div>
      `
      return
    }
    
    // Run route guard if exists
    if (match.route.guard) {
      const canActivate = await match.route.guard(match, this.currentMatch)
      if (!canActivate) {
        if (isDevEnv()) console.warn(`Route guard blocked navigation to ${path}`)
        // Revert to previous path
        if (this.currentMatch) {
          this.replace(this.currentMatch.path)
        } else {
          this.replace('/')
        }
        return
      }
    }
    
    // Invoke previous routed cleanup before switching
    if (this.routeCleanup) {
      try { this.routeCleanup() } catch (e) { console.error('Error in routed cleanup:', e) }
      this.routeCleanup = null
    }

    // Call routed lifecycle for the incoming route (before component render)
    if (match.route.routed) {
      try {
        const cleanup = match.route.routed(this.state, match.params, this.currentMatch)
        if (typeof cleanup === 'function') {
          this.routeCleanup = cleanup
        }
      } catch (e) {
        console.error('Error in routed lifecycle:', e)
      }
    }

    // Update current match
    const previous = this.currentMatch
    this.currentMatch = match
    this.currentParams.value = match.params
    this.currentQuery.value = match.query
    
    // Cleanup old component
    const oldChild = this.container.firstChild as any
    if (oldChild?.__cleanup) {
      oldChild.__cleanup()
    }
    
    // Render new component
    this.container.innerHTML = ''

    // Provide routed context to component lifecycle hooks
    setRoutedContext({
      state: this.state,
      params: match.params,
      query: match.query,
      prev: previous,
      path: match.path,
      router: this,
    })

    // Create a component lifecycle context so onMount/onRouted work inside route components
    const context = createComponentContext();
    setCurrentComponent(context);
    setWatchContext(context.cleanups);

    const child = match.route.component(match.params, match.query);

    // Clear contexts after component creation
    setCurrentComponent(null);
    setWatchContext(null);
    setRoutedContext(null);

    const wrapped = match.route.layout ? match.route.layout(child, match.params, match.query) : child;

    // Attach cleanup to the element we append so router can clean previous view
    (wrapped as any).__context = context;
    (wrapped as any).__cleanup = () => {
      executeCleanup(context);
    };

    this.container.appendChild(wrapped);

    // Execute mount callbacks now that element is in the DOM
    executeMountCallbacks(context);
  }
  
  /**
   * Start the router (call after adding all routes)
   */
  start() {
    this.render(this.currentPath.value, this.parseQuery())
    this.setupDomObserver()
  }

  // Normalize a route string to a case-insensitive, no-trailing-slash key
  private normalizeRoute(route: string): string {
    let normalized = route.toString().toLowerCase()
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  // Build a compiled regex from a normalized route pattern string
  private buildRegexForPattern(normalizedRoute: string): RegExp {
    // Convert route pattern to regex (e.g., /products/:id -> /products/(?<id>[^/]+))
    const pattern = normalizedRoute.replace(/:\w+/g, (match) => {
      const paramName = match.slice(1)
      return `(?<${paramName}>[^/]+)`
    })
    return new RegExp(`^${pattern}${normalizedRoute === '/' ? '' : '(?:/)?'}$`)
  }
  
  /**
   * Get current route match
   */
  getCurrentRoute(): RouteMatch | null {
    return this.currentMatch
  }

  /**
   * Destroy router side-effects and detach global listeners.
   * Call this when the app is unmounted to avoid leaking handlers.
   */
  destroy() {
    try {
      window.removeEventListener('popstate', this.onPopState)
    } catch {}
    // Run route-level cleanup if present
    if (this.routeCleanup) {
      try { this.routeCleanup() } catch {}
      this.routeCleanup = null
    }
    // Disconnect DOM observer
    if (this.domObserver) {
      try { this.domObserver.disconnect() } catch {}
      this.domObserver = null
    }
  }

  // Central DOM lifecycle observer: mounts and cleanups
  private setupDomObserver() {
    if (typeof MutationObserver === 'undefined') return
    if (this.domObserver) return
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        // Cleanups for removed nodes
        m.removedNodes.forEach((n) => this.runCleanupForNode(n))
        // Mount callbacks for added nodes
        m.addedNodes.forEach((n) => this.runMountForNode(n))
      }
    })
    observer.observe(this.container, { childList: true, subtree: true })
    this.domObserver = observer
  }

  private runMountForNode(node: Node) {
    // Only Elements can carry contexts
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement & { __context?: any }
    // Depth-first: run for node and descendants
    this.maybeRunMount(el)
    for (const child of Array.from(el.children)) {
      this.runMountForNode(child)
    }
  }

  private maybeRunMount(el: any) {
    const ctx = el?.__context
    if (ctx && el.isConnected) {
      try { executeMountCallbacks(ctx) } catch {}
    }
  }

  private runCleanupForNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement & { __cleanup?: () => void }
    this.maybeRunCleanup(el)
    for (const child of Array.from(el.children)) {
      this.runCleanupForNode(child)
    }
  }

  private maybeRunCleanup(el: any) {
    const fn = el?.__cleanup
    if (typeof fn === 'function') {
      try { fn() } catch {}
    }
  }
}

// Global router instance reference
let routerInstance: Router<any> | null = null

/**
 * Set the global router instance
 * @internal
 */
export function setRouter(router: Router<any>) {
  routerInstance = router
}

/**
 * Get the global router instance
 */
export function getRouter(): Router<any> {
  if (!routerInstance) {
    throw new Error('Router not initialized. Call setRouter() first.')
  }
  return routerInstance
}

/**
 * Create a navigational link that integrates with the router.
 * Automatically sets an active class when the current path matches.
 * 
 * Example (JSX):
 * `<Link to="/products" text="Shop Now" className="text-blue-600 hover:underline" />`
 * 
 * Using `pathFor` to build the `to` URL (JSX):
 * ```tsx
 * import { pathFor } from './routes'
 * <Link to={pathFor('/users/:id', { id })} text="Profile" />
 * ```
 *
 * Example with active state (JSX):
 * `<Link to="/products" text="Products" className="px-4 py-2" activeClassName="bg-indigo-600 text-white" />`
 * 
 * Example with params/query (JSX):
 * `<Link to="/users/:id" params={{ id }} query={{ tab: 'posts' }} text="View Posts" />`
 * 
 * Builder usage remains supported:
 * ```typescript
 * ui.append(Link({
 *   to: '/products',
 *   text: 'Shop Now',
 *   className: 'text-blue-500 hover:underline'
 * }))
 * ```
 */
import { Component } from "./dsl"

export function Link<P extends string>(config: {
  to: P;
  params?: PathParams<P>;
  query?: Record<string, string | number>;
  text: string | Ref<string>;
  className?: string | Ref<string>;
  activeClassName?: string;
}) {
  return Component((ui) => {
    const stripQuery = (p: string) => p.split('?')[0] || p;
    const buildHref = () => {
      let pathStr: string = String(config.to);
      if (config.params) {
        for (const [k, v] of Object.entries(config.params)) {
          pathStr = pathStr.replace(`:${k}`, encodeURIComponent(String(v)));
        }
      }
      const qs = config.query
        ? new URLSearchParams(
            Object.entries(config.query).map(([k, v]) => [k, String(v)])
          ).toString()
        : '';
      return qs ? `${pathStr}?${qs}` : pathStr;
    };

    let router: Router | null = null;
    let isActive: Ref<boolean> | null = null;
    let className: string | Ref<string> = config.className || '';
    const href = buildHref();

    try {
      router = getRouter();
      isActive = watch(router.currentPath, (path) => {
        return stripQuery(path) === stripQuery(href);
      }) as Ref<boolean>;

      if (config.activeClassName) {
        const base = typeof className === 'string' ? className : className?.value || '';
        className = watch(isActive, (active) => (active ? `${base} ${config.activeClassName}` : base)) as Ref<string>;
      }
    } catch (e) {
      // Router not initialized; fall back to provided className.
    }

    ui.A({
      href,
      text: config.text,
      className: className || '',
      on: {
        click: (e) => {
          e.preventDefault();
          try {
            const r = getRouter();
            r.push(href);
          } catch (err) {
            console.error('Router not available:', err);
          }
        },
      },
    });
  });
}

/**
 * Hook to access the router inside a component.
 * 
 * Example (JSX):
 * ```tsx
 * function Nav() {
 *   const router = useRouter()
 *   return <button onClick={() => router.push('/products')}>Go to Products</button>
 * }
 * ```
 * 
 * Builder usage remains supported.
 */
export function useRouter(): Router<any> {
  return getRouter()
}

/**
 * Hook to access current route params.
 * 
 * Example (JSX):
 * ```tsx
 * function ProductPage() {
 *   const params = useParams()
 *   return <div>Product ID: {params.value.id}</div>
 * }
 * ```
 * 
 * Builder usage remains supported.
 */
export function useParams(): Ref<RouteParams> {
  return getRouter().currentParams
}

/**
 * Hook to access current URL query parameters.
 * 
 * Example (JSX):
 * ```tsx
 * function SearchPage() {
 *   const query = useQuery()
 *   return <div>Search: {query.value.q} • Page: {query.value.page}</div>
 * }
 * ```
 * 
 * Builder usage remains supported.
 */
export function useQuery(): Ref<QueryParams> {
  return getRouter().currentQuery
}
// Decoder for a param: either a built-in coercion or a custom function
export type ParamDecoder = 'string' | 'number' | ((raw: string) => any)
