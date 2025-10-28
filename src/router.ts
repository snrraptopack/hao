import { ref, watch, type Ref } from "./state";

export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string>;

export type RouteGuard = (to: RouteMatch, from: RouteMatch | null) => boolean | Promise<boolean>;

// Infer param names from a ":param" path pattern
type PathParamNames<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | PathParamNames<`/${Rest}`> :
  S extends `${string}:${infer P}` ? P :
  never;

export type PathParams<S extends string> = Record<PathParamNames<S>, string>;

export type RoutedContext = {
  state: Record<string, any>;
  params: RouteParams;
  query: QueryParams;
  prev: RouteMatch<any> | null;
  path: string;
  router: Router;
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
export class Router {
  private routes: Route<any>[] = []
  public currentPath: Ref<string>
  public currentParams: Ref<RouteParams>
  public currentQuery: Ref<QueryParams>
  private container: HTMLElement
  private currentMatch: RouteMatch<any> | null = null
  private routeCleanup: (() => void) | null = null
  
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
    console.log('🗑️ Router cache cleared')
  }
  
  /**
   * Clear specific cache key
   */
  clearCacheKey(key: string) {
    delete this.state[key]
    console.log(`cache for: ${key}`)
  }
  
  constructor(routes: Route[] = [], container?: HTMLElement) {
    this.routes = routes
    this.container = container || document.body
    this.currentPath = ref(window.location.pathname)
    this.currentParams = ref({})
    this.currentQuery = ref({})
    
    // Listen to browser back/forward
    window.addEventListener('popstate', () => {
      this.currentPath.value = window.location.pathname
    })
    
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
    ) => void | (() => void) }
  ) {
    this.routes.push({
      path,
      component: component as any,
      name: options?.name,
      guard: options?.guard,
      layout: options?.layout as any,
      routed: options?.routed as any,
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
  push(path: string) {
    if (path === this.currentPath.value) return
    window.history.pushState({}, '', path)
    this.currentPath.value = this.getPathWithoutQuery(path)
  }
  
  /**
   * Replace current path (no history entry)
   * 
   * @example
   * ```typescript
   * router.replace('/login') // Replaces current history entry
   * ```
   */
  replace(path: string) {
    window.history.replaceState({}, '', path)
    this.currentPath.value = this.getPathWithoutQuery(path)
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
  pushNamed(name: string, params?: RouteParams) {
    const route = this.routes.find(r => r.name === name)
    if (!route) {
      console.error(`Route with name "${name}" not found`)
      return
    }
    
    let path = typeof route.path === 'string' ? route.path : route.path.source
    
    // Replace params in path
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(`:${key}`, value)
      })
    }
    
    this.push(path)
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
    return this.currentPath.value === path
  }
  
  private getPathWithoutQuery(fullPath: string): string {
    const parts = fullPath.split('?')
    return parts[0] || '/'
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
    console.log('Matching path:', path, 'against routes:', this.routes.map(r => r.path))
    
    for (const route of this.routes) {
      if (typeof route.path === 'string') {
        // Case-insensitive matching: normalize both pattern and incoming path to lower-case
        const normalizedPath = path.toLowerCase();
        const normalizedRoute = route.path.toString().toLowerCase();

        // Convert route pattern to regex (e.g., /products/:id -> /products/(?<id>[^/]+))
        const pattern = normalizedRoute.replace(/:\w+/g, (match) => {
          const paramName = match.slice(1) // Remove the ':'
          return `(?<${paramName}>[^/]+)`
        })

        const regex = new RegExp(`^${pattern}$`)
        const match = normalizedPath.match(regex)

        console.log(`Testing ${path} against ${route.path} (regex: ${regex}):`, match)

        if (match) {
          return {
            route,
            params: match.groups || {},
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
        console.warn(`Route guard blocked navigation to ${path}`)
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
      prev: this.currentMatch,
      path: match.path,
      router: this,
    })
    const child = match.route.component(match.params, match.query)
    // Clear routed context after component creation
    setRoutedContext(null)
    const wrapped = match.route.layout ? match.route.layout(child, match.params, match.query) : child
    this.container.appendChild(wrapped)
  }
  
  /**
   * Start the router (call after adding all routes)
   */
  start() {
    this.render(this.currentPath.value, this.parseQuery())
  }
  
  /**
   * Get current route match
   */
  getCurrentRoute(): RouteMatch | null {
    return this.currentMatch
  }
}

// Global router instance reference
let routerInstance: Router | null = null

/**
 * Set the global router instance
 * @internal
 */
export function setRouter(router: Router) {
  routerInstance = router
}

/**
 * Get the global router instance
 */
export function getRouter(): Router {
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
import { watch as watchRef } from "./state"

export function Link(config: {
  to: string;
  params?: Record<string, string | number>;
  query?: Record<string, string | number>;
  text: string | Ref<string>;
  className?: string | Ref<string>;
  activeClassName?: string;
}) {
  return Component((ui) => {
    const stripQuery = (p: string) => p.split('?')[0] || p;
    const buildHref = () => {
      let path = config.to;
      if (config.params) {
        for (const [k, v] of Object.entries(config.params)) {
          path = path.replace(`:${k}`, encodeURIComponent(String(v)));
        }
      }
      const qs = config.query
        ? new URLSearchParams(
            Object.entries(config.query).map(([k, v]) => [k, String(v)])
          ).toString()
        : '';
      return qs ? `${path}?${qs}` : path;
    };

    let router: Router | null = null;
    let isActive: Ref<boolean> | null = null;
    let className: string | Ref<string> = config.className || '';
    const href = buildHref();

    try {
      router = getRouter();
      isActive = watchRef(router.currentPath, (path) => {
        return stripQuery(path) === stripQuery(href);
      }) as Ref<boolean>;

      if (config.activeClassName) {
        const base = typeof className === 'string' ? className : className?.value || '';
        className = watchRef(isActive, (active) => (active ? `${base} ${config.activeClassName}` : base)) as Ref<string>;
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
export function useRouter(): Router {
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
