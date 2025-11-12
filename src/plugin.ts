/**
 * Plugin system for Auwla
 * 
 * Provides a simple, type-safe way to compose and share context across pages and layouts.
 * Plugins are just functions that return objects - no complex lifecycle required.
 * 
 * @example
 * ```typescript
 * // Define a plugin
 * const authPlugin = definePlugin(() => ({
 *   user: ref<User | null>(null),
 *   login: async (email: string, password: string) => { ... }
 * }))
 * 
 * // Use in a page
 * const Page = definePage((ctx) => {
 *   ctx.auth.user.value // Type-safe access
 *   return <div/>
 * }, [authPlugin])
 * ```
 */

/**
 * A plugin is a function that returns an object to be merged into the page context.
 * The returned object can contain any properties: refs, functions, plain values, etc.
 */
export type Plugin<T = any> = () => T

/**
 * Define a plugin by providing a setup function that returns the plugin context.
 * This is an identity function that exists primarily for type inference.
 * 
 * @param setup - Function that returns the plugin context object
 * @returns The same setup function, typed as a Plugin
 * 
 * @example
 * ```typescript
 * const counterPlugin = definePlugin(() => ({
 *   count: ref(0),
 *   increment() { this.count.value++ }
 * }))
 * ```
 */
export function definePlugin<T>(setup: () => T): Plugin<T> {
  return setup
}

/**
 * Helper to create a tuple of plugins with proper type inference.
 * Use this when passing plugins to definePage or defineLayout.
 * 
 * @param plugins - Plugins to compose
 * @returns The same plugins array as a readonly tuple
 * 
 * @example
 * ```typescript
 * const Page = definePage(
 *   (ctx) => {
 *     ctx.$api.getUser() // Type-safe!
 *     return <div/>
 *   },
 *   plugins(fullstackPlugin($api), authPlugin())
 * )
 * ```
 */
export function plugins<T extends Plugin<any>[]>(...pluginList: T): T {
  return pluginList
}

/**
 * Type helper to recursively infer and merge the return types of multiple plugins.
 * This enables full TypeScript autocomplete for composed plugin contexts.
 * 
 * @example
 * ```typescript
 * type Combined = InferPlugins<[typeof authPlugin, typeof i18nPlugin]>
 * // Result: { user: Ref<User>, login: (...) => Promise<void>, locale: Ref<string>, t: (key: string) => string }
 * ```
 */
export type InferPlugins<P extends readonly Plugin<any>[]> = 
  P extends readonly [Plugin<infer T>, ...infer Rest]
    ? T & (Rest extends readonly Plugin<any>[] ? InferPlugins<Rest> : {})
    : {}

/**
 * Global plugin context stack for managing context inheritance through layout hierarchy.
 * Each layout pushes its context onto the stack, and pages inherit from the current stack top.
 */
let pluginContextStack: any[] = [{}]

/**
 * Push a new plugin context onto the stack.
 * This merges the new context with the parent context and pushes the result.
 * Used by layouts to provide context to child pages.
 * 
 * @param context - The plugin context to push
 * 
 * @example
 * ```typescript
 * // In a layout
 * const layoutContext = createPluginContext([authPlugin])
 * pushPluginContext(layoutContext)
 * ```
 */
export function pushPluginContext(context: any): void {
  const parent = pluginContextStack[pluginContextStack.length - 1] || {}
  pluginContextStack.push({ ...parent, ...context })
}

/**
 * Pop the current plugin context from the stack.
 * Used by layouts on unmount to clean up context.
 * Will not pop the root context (stack always has at least one element).
 * 
 * @example
 * ```typescript
 * // In a layout cleanup
 * onUnmount(() => {
 *   popPluginContext()
 * })
 * ```
 */
export function popPluginContext(): void {
  if (pluginContextStack.length > 1) {
    pluginContextStack.pop()
  }
}

/**
 * Get the current plugin context from the top of the stack.
 * This returns the merged context from all parent layouts.
 * 
 * @returns The current plugin context
 * 
 * @example
 * ```typescript
 * const parentContext = getPluginContext()
 * // Contains all plugin contexts from parent layouts
 * ```
 */
export function getPluginContext<T = any>(): T {
  return pluginContextStack[pluginContextStack.length - 1] as T
}

// Cache plugin results so they're only executed once
const pluginCache = new WeakMap<Plugin<any>, any>()

/**
 * Create a plugin context by executing all plugins and merging their results.
 * Each plugin is called once and cached, so subsequent calls return the same instance.
 * This ensures refs and state are shared across layout and pages.
 * 
 * @param plugins - Array of plugins to execute
 * @returns Merged context object containing all plugin properties
 * 
 * @example
 * ```typescript
 * const context = createPluginContext([authPlugin, i18nPlugin])
 * // context now has: { user, login, locale, t }
 * ```
 */
export function createPluginContext<P extends readonly Plugin<any>[]>(
  plugins: P
): InferPlugins<P> {
  const context: any = {}
  
  for (const plugin of plugins) {
    // Check cache first
    let pluginResult = pluginCache.get(plugin)
    
    if (!pluginResult) {
      // Execute plugin and cache the result
      pluginResult = plugin()
      pluginCache.set(plugin, pluginResult)
    }
    
    Object.assign(context, pluginResult)
  }
  
  return context
}
