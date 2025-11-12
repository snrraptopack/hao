/**
 * Meta layer for Auwla
 * 
 * Provides `definePage` and `defineLayout` functions that enable plugin-based context composition.
 * This is a thin wrapper around core Auwla that adds plugin context injection.
 * 
 * @example
 * ```typescript
 * const UserPage = definePage(
 *   (ctx) => {
 *     const user = createResource('user', () => ctx.$api.getUser({ id: ctx.params.id }))
 *     return <div>{user.data.value?.name}</div>
 *   },
 *   [fullstackPlugin($api)]
 * )
 * ```
 */

import { useRouter, useParams, useQuery, type RouteParams, type QueryParams, type Router, type RouteMatch } from './router'
import { onRouted, onUnmount } from './lifecycle'
import { getPluginContext, createPluginContext, pushPluginContext, popPluginContext, type Plugin, type InferPlugins } from './plugin'


/**
 * Page context type that includes route information and plugin extensions.
 * This is the context object passed to page and layout components.
 * 
 * @template P - Array of plugins whose return types will be merged into the context
 */
export type PageContext<P extends readonly Plugin<any>[] = []> = {
  /** Route parameters (e.g., { id: '123' } for /users/:id) */
  params: RouteParams
  /** Query string parameters (e.g., { page: '2' } for ?page=2) */
  query: QueryParams
  /** Current path (e.g., '/users/123') */
  path: string
  /** Auwla router instance */
  router: Router<any>
  /** Previous route match (null if first navigation) */
  prev: RouteMatch<any> | null
} & InferPlugins<P>

/**
 * Define a page component with optional plugin context.
 * 
 * The component function receives a context object containing route information
 * and all plugin-provided properties. Use core Auwla primitives (createResource,
 * ref, onMount, etc.) directly in the component for data fetching and state management.
 * 
 * @param component - Function that receives context and returns an HTMLElement
 * @param plugins - Optional array of plugins to extend the context
 * @returns A route component function compatible with Auwla router
 * 
 * @example
 * ```typescript
 * import { ref, createResource, onMount } from 'auwla'
 * 
 * const UserPage = definePage(
 *   (ctx) => {
 *     // Access route info
 *     const userId = ctx.params.id
 *     
 *     // Use plugin context
 *     const user = createResource('user', () => ctx.$api.getUser({ id: userId }))
 *     
 *     // Use lifecycle hooks from core
 *     onMount(() => {
 *       console.log('Page mounted')
 *     })
 *     
 *     return (
 *       <div>
 *         {user.loading.value && <p>Loading...</p>}
 *         {user.data.value && <p>{user.data.value.name}</p>}
 *       </div>
 *     )
 *   },
 *   [fullstackPlugin($api)]
 * )
 * ```
 */
export function definePage<P extends readonly Plugin<any>[]>(
  component: (ctx: PageContext<P>) => HTMLElement,
  plugins?: P
) {
  const pluginsArray = (plugins || []) as P
  return function PageComponent(): HTMLElement {
    const router = useRouter()
    const paramsRef = useParams()
    const queryRef = useQuery()
    
    // Get parent context from stack (inherited from layouts)
    const parentContext = getPluginContext()
    
    // Create page plugin context
    const pagePluginContext = createPluginContext(pluginsArray)
    
    // Merge parent + page plugins
    const fullPluginContext = { ...parentContext, ...pagePluginContext }
    
    // Build complete context
    const ctx: PageContext<P> = {
      params: paramsRef.value,
      query: queryRef.value,
      path: router.currentPath.value,
      router,
      prev: router.getCurrentRoute(),
      ...fullPluginContext
    } as PageContext<P>
    
    // Render component with context
    return component(ctx)
  }
}

/**
 * Define a layout component that wraps child pages and provides plugin context.
 * 
 * Layouts can provide plugins that are automatically inherited by all child pages.
 * The layout component receives the same context as pages, plus a child element to wrap.
 * 
 * @param component - Function that receives context, child element, and returns an HTMLElement
 * @param plugins - Optional array of plugins to provide to child pages
 * @returns A layout function compatible with Auwla router
 * 
 * @example
 * ```typescript
 * import { onMount } from 'auwla'
 * 
 * const AuthLayout = defineLayout(
 *   (ctx, child) => {
 *     // Check auth on mount
 *     onMount(() => {
 *       if (!ctx.auth.isAuthenticated.value) {
 *         ctx.router.push('/login')
 *       }
 *     })
 *     
 *     return (
 *       <div class="auth-layout">
 *         <header>User: {ctx.auth.user.value?.name}</header>
 *         <main>{child}</main>
 *       </div>
 *     )
 *   },
 *   [authPlugin()]
 * )
 * 
 * // Child pages automatically have access to auth plugin
 * const DashboardPage = definePage(
 *   (ctx) => {
 *     // ctx.auth is available (inherited from layout)
 *     return <div>Welcome, {ctx.auth.user.value?.name}</div>
 *   }
 * )
 * ```
 */
export function defineLayout<P extends readonly Plugin<any>[]>(
  component: (ctx: PageContext<P>, child: HTMLElement) => HTMLElement,
  plugins?: P
) {
  const pluginsArray = (plugins || []) as P
  
  // Create a page helper that automatically includes layout plugins
  const layoutPageHelper = <PagePlugins extends readonly Plugin<any>[]>(
    pageComponent: (ctx: PageContext<[...P, ...PagePlugins]>) => HTMLElement,
    pagePlugins?: PagePlugins
  ) => {
    const allPlugins = pagePlugins 
      ? ([...pluginsArray, ...pagePlugins] as const)
      : pluginsArray
    return definePage(pageComponent, allPlugins as any)
  }
  
  const LayoutComponent = function LayoutComponent(child: HTMLElement): HTMLElement {
    const router = useRouter()
    const paramsRef = useParams()
    const queryRef = useQuery()
    
    // Get parent context
    const parentContext = getPluginContext()
    
    // Create layout plugin context
    const layoutPluginContext = createPluginContext(pluginsArray)
    
    // Merge parent + layout plugins
    const fullPluginContext = { ...parentContext, ...layoutPluginContext }
    
    // Push context for children
    pushPluginContext(fullPluginContext)
    
    // Build complete context
    const ctx: PageContext<P> = {
      params: paramsRef.value,
      query: queryRef.value,
      path: router.currentPath.value,
      router,
      prev: router.getCurrentRoute(),
      ...fullPluginContext
    } as PageContext<P>
    
    // Render layout with child
    return component(ctx, child)
  }
  
  // Attach the page helper to the layout component
  ;(LayoutComponent as any).definePage = layoutPageHelper
  
  return LayoutComponent as typeof LayoutComponent & {
    definePage: typeof layoutPageHelper
  }
}
