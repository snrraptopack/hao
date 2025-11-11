import { type RoutedContext, type RouteParams, type QueryParams, type Router, type RouteMatch } from 'auwla'
import { isDevEnv, devHook } from 'auwla'

// Base context provided by the router
export type LoaderContextBase = {
  params: RouteParams
  query: QueryParams
  path: string
  router: Router<any>
  prev: RouteMatch<any> | null
}

// Global augmentation hook: plugins can `declare global { interface AuwlaMetaContext { ... } }`
declare global {
  interface AuwlaMetaContext {}
}

export type MetaContextExtensions = AuwlaMetaContext

export type LoaderContext<Ext = {}> = LoaderContextBase & MetaContextExtensions & Ext

export type BeforeLoadFn<Ctx> = (ctx: Ctx) => void | Promise<void>
export type AfterLoadFn<Ctx, Data> = (ctx: Ctx, data: Data) => void | Promise<void>

export type MetaPlugin<Ext = {}> = {
  name: string
  onContextCreate?: (ctx: LoaderContext<Ext>) => void | Promise<void>
  onBeforeLoad?: BeforeLoadFn<LoaderContext<Ext>>
  onAfterLoad?: AfterLoadFn<LoaderContext<Ext>, any>
  // Optional error hook for loaders or plugins to react to failures
  onError?: (ctx: LoaderContext<Ext>, error: any) => void | Promise<void>
}

export function definePlugin<Ext = {}>(plugin: MetaPlugin<Ext>): MetaPlugin<Ext> {
  return plugin
}

export class MetaRuntime<Ext = {}> {
  private plugins: MetaPlugin<Ext>[]

  constructor(plugins: MetaPlugin<Ext>[] = []) {
    this.plugins = plugins
  }

  createContext(routed: RoutedContext): LoaderContext<Ext> {
    const ctx = {
      params: routed.params,
      query: routed.query,
      path: routed.path,
      router: routed.router,
      prev: routed.prev,
    } as LoaderContext<Ext>
    
    // DevTools: track context creation
    if (isDevEnv()) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      devHook('onContextCreated', id, 'LoaderContext', 'MetaRuntime')
    }
    
    // Allow plugins to extend/initialize
    for (const p of this.plugins) {
      try { p.onContextCreate?.(ctx) } catch (e) { /* swallow */ }
    }
    return ctx
  }

  async applyBeforeLoad(ctx: LoaderContext<Ext>): Promise<void> {
    for (const p of this.plugins) {
      if (p.onBeforeLoad) {
        await p.onBeforeLoad(ctx)
      }
    }
  }

  async applyAfterLoad<T>(ctx: LoaderContext<Ext>, data: T): Promise<void> {
    for (const p of this.plugins) {
      if (p.onAfterLoad) {
        await p.onAfterLoad(ctx, data)
      }
    }
  }

  async applyOnError(ctx: LoaderContext<Ext>, error: any): Promise<void> {
    for (const p of this.plugins) {
      if (p.onError) {
        try { await p.onError(ctx, error) } catch { /* swallow */ }
      }
    }
  }
}

export function createMetaRuntime<Ext = {}>(plugins: MetaPlugin<Ext>[] = []) {
  return new MetaRuntime<Ext>(plugins)
}