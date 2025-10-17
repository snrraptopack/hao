import { ref, watch, type Ref } from "./state";

export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string>;

export type RouteGuard = (to: RouteMatch, from: RouteMatch | null) => boolean | Promise<boolean>;

export type Route = {
  path: string | RegExp;
  component: (params?: RouteParams, query?: QueryParams) => HTMLElement;
  name?: string;
  guard?: RouteGuard;
}

export type RouteMatch = {
  route: Route;
  params: RouteParams;
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
  private routes: Route[] = []
  public currentPath: Ref<string>
  public currentParams: Ref<RouteParams>
  public currentQuery: Ref<QueryParams>
  private container: HTMLElement
  private currentMatch: RouteMatch | null = null
  
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
    console.log(`🗑️ Cleared cache for: ${key}`)
  }
  
  constructor(container: HTMLElement) {
    this.container = container
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
  add(
    path: string | RegExp, 
    component: (params?: RouteParams, query?: QueryParams) => HTMLElement,
    options?: { name?: string; guard?: RouteGuard }
  ) {
    this.routes.push({ 
      path, 
      component, 
      name: options?.name,
      guard: options?.guard
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
  
  private matchRoute(path: string): RouteMatch | null {
    console.log('Matching path:', path, 'against routes:', this.routes.map(r => r.path))
    
    for (const route of this.routes) {
      if (typeof route.path === 'string') {
        // Convert route pattern to regex (e.g., /products/:id -> /products/(?<id>[^/]+))
        const pattern = route.path.replace(/:\w+/g, (match) => {
          const paramName = match.slice(1) // Remove the ':'
          return `(?<${paramName}>[^/]+)`
        })
        
        const regex = new RegExp(`^${pattern}$`)
        const match = path.match(regex)
        
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
        // RegExp match
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
    this.container.appendChild(match.route.component(match.params, match.query))
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
 * Create a link component that uses the router
 * 
 * @example
 * ```typescript
 * ui.append(Link({ 
 *   to: '/products', 
 *   text: 'Shop Now',
 *   className: 'text-blue-500 hover:underline'
 * }))
 * 
 * // With active state
 * ui.append(Link({ 
 *   to: '/products', 
 *   text: 'Products',
 *   className: 'px-4 py-2',
 *   activeClassName: 'bg-indigo-600 text-white'
 * }))
 * ```
 */
import { Component } from "./dsl"
import { watch as watchRef } from "./state"

export function Link(config: {
  to: string;
  text: string | Ref<string>;
  className?: string | Ref<string>;
  activeClassName?: string;
}) {
  return Component((ui) => {
    const router = getRouter()
    
    // Watch if this link is active
    const isActive = watchRef(router.currentPath, (path) => {
      return path === config.to
    }) as Ref<boolean>
    
    // Combine class names
    const className = config.activeClassName
      ? watchRef(isActive, (active) => {
          const base = typeof config.className === 'string' 
            ? config.className 
            : config.className?.value || ''
          return active ? `${base} ${config.activeClassName}` : base
        }) as Ref<string>
      : config.className
    
    ui.Button({
      text: config.text,
      className: className || '',
      on: {
        click: (e) => {
          e.preventDefault()
          router.push(config.to)
        }
      }
    })
  })
}

/**
 * Hook to access router in components
 * 
 * @example
 * ```typescript
 * const App = Component((ui) => {
 *   const router = useRouter()
 *   
 *   ui.Button({
 *     text: "Go to Products",
 *     on: { click: () => router.push('/products') }
 *   })
 * })
 * ```
 */
export function useRouter(): Router {
  return getRouter()
}

/**
 * Hook to access current route params
 * 
 * @example
 * ```typescript
 * const ProductPage = Component((ui) => {
 *   const params = useParams()
 *   
 *   ui.Text({ 
 *     value: params,
 *     formatter: (p) => `Product ID: ${p.id}`
 *   })
 * })
 * ```
 */
export function useParams(): Ref<RouteParams> {
  return getRouter().currentParams
}

/**
 * Hook to access current query params
 * 
 * @example
 * ```typescript
 * const SearchPage = Component((ui) => {
 *   const query = useQuery()
 *   
 *   ui.Text({ 
 *     value: query,
 *     formatter: (q) => `Search: ${q.q}, Page: ${q.page}`
 *   })
 * })
 * ```
 */
export function useQuery(): Ref<QueryParams> {
  return getRouter().currentQuery
}
