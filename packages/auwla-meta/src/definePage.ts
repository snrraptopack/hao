import { onRouted } from 'auwla'
import { useRouter, type RoutedContext } from 'auwla'
import { createMetaRuntime, type MetaPlugin, type LoaderContext } from './runtime'

export type PageDefinition<Ext = {}, LoaderReturn = void> = {
  // Optional loader: runs on route navigation
  loader?: (ctx: LoaderContext<Ext>) => LoaderReturn | Promise<LoaderReturn>
  // Component: receives the loader context and return value
  component: (ctx: LoaderContext<Ext>, loaderData: LoaderReturn) => HTMLElement
  // Optional route meta
  meta?: Record<string, any>
}

export type LayoutDefinition<Ext = {}, LoaderReturn = void> = {
  // Optional loader: runs on route navigation
  loader?: (ctx: LoaderContext<Ext>) => LoaderReturn | Promise<LoaderReturn>
  // Component: receives the loader context, return value, and child element
  component: (ctx: LoaderContext<Ext>, loaderData: LoaderReturn, child: HTMLElement) => HTMLElement
  // Optional route meta
  meta?: Record<string, any>
}

// Global plugin context stack for inheritance
let pluginContextStack: MetaPlugin<any>[][] = [[]]

export function pushPluginContext(plugins: MetaPlugin<any>[]) {
  const parent = pluginContextStack[pluginContextStack.length - 1] || []
  pluginContextStack.push([...parent, ...plugins])
}

export function popPluginContext() {
  if (pluginContextStack.length > 1) {
    pluginContextStack.pop()
  }
}

export function getCurrentPlugins(): MetaPlugin<any>[] {
  return pluginContextStack[pluginContextStack.length - 1] || []
}

export function definePage<Ext = {}, LoaderReturn = void>(
  def: PageDefinition<Ext, LoaderReturn>,
  plugins: MetaPlugin<Ext>[] = []
) {
  // Inherit plugins from current context stack
  const parentPlugins = getCurrentPlugins()
  const allPlugins = [...parentPlugins, ...plugins]
  const runtime = createMetaRuntime<Ext>(allPlugins)

  return function PageComponent(): HTMLElement {
    const router = useRouter()
    
    // Initialize context immediately with current router state to avoid "used before assigned"
    let ctx: LoaderContext<Ext> = runtime.createContext({
      params: {},
      query: {},
      path: router.currentPath.value,
      router,
      prev: null,
    } as RoutedContext)
    let loaderData: LoaderReturn = undefined as any
    
    // Update context on mount with routed information
    onRouted((routed: RoutedContext) => {
      ctx = runtime.createContext(routed)
      
      // Run loader if defined
      if (def.loader) {
        const runLoader = async () => {
          try {
            await runtime.applyBeforeLoad(ctx)
            loaderData = await def.loader!(ctx)
            await runtime.applyAfterLoad(ctx, loaderData)
          } catch (error) {
            await runtime.applyOnError(ctx, error)
            throw error
          }
        }
        
        // Execute loader (can be async)
        void runLoader()
      }
    })
    
    // Render component with context and loader data
    return def.component(ctx, loaderData)
  }
}

export function defineLayout<Ext = {}, LoaderReturn = void>(
  def: LayoutDefinition<Ext, LoaderReturn>,
  plugins: MetaPlugin<Ext>[] = []
) {
  // Return a layout function compatible with core Auwla's group() and Route.layout
  // Signature: (child: HTMLElement, params?: RouteParams, query?: QueryParams) => HTMLElement
  return function LayoutComponent(
    child: HTMLElement,
    params?: Record<string, string | number>,
    query?: Record<string, string>
  ): HTMLElement {
    // Push plugin context for children
    const parentPlugins = getCurrentPlugins()
    const allPlugins = [...parentPlugins, ...plugins]
    pushPluginContext(allPlugins)
    
    // Create runtime with all plugins
    const runtime = createMetaRuntime<Ext>(allPlugins)
    const router = useRouter()
    
    // Initialize context immediately with current router state
    let ctx: LoaderContext<Ext> = runtime.createContext({
      params: params || {},
      query: query || {},
      path: router.currentPath.value,
      router,
      prev: null,
    } as RoutedContext)
    let loaderData: LoaderReturn = undefined as any
    
    onRouted((routed: RoutedContext) => {
      ctx = runtime.createContext(routed)
      
      if (def.loader) {
        const runLoader = async () => {
          try {
            await runtime.applyBeforeLoad(ctx)
            loaderData = await def.loader!(ctx)
            await runtime.applyAfterLoad(ctx, loaderData)
          } catch (error) {
            await runtime.applyOnError(ctx, error)
            throw error
          }
        }
        void runLoader()
      }
    })
    
    // TODO: Pop plugin context on unmount
    // This requires lifecycle integration - for now context persists during navigation
    
    return def.component(ctx, loaderData, child)
  }
}