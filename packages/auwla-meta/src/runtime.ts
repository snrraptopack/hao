import { type RoutedContext } from 'auwla'
import { isDevEnv, devHook } from 'auwla'

export type MetaContextBase = RoutedContext

// Global augmentation hook: plugins can `declare global { interface AuwlaMetaContext { ... } }`
declare global {
  interface AuwlaMetaContext {}
}

export type MetaContextExtensions = AuwlaMetaContext

export type PageContext<Ext = {}> = MetaContextBase & MetaContextExtensions & Ext

export type BeforeLoadFn<Ctx> = (ctx: Ctx) => void | Promise<void>
export type AfterLoadFn<Ctx, Data> = (
  ctx: Ctx,
  data: Data,
  setError: (e: any) => void
) => void | Promise<void>

export type MetaPlugin<Ext = {}> = {
  name: string
  onContextCreate?: (ctx: PageContext<Ext>) => void | Promise<void>
  onBeforeLoad?: BeforeLoadFn<PageContext<Ext>>
  onAfterLoad?: AfterLoadFn<PageContext<Ext>, any>
  // Optional error hook for loaders or plugins to react to failures
  onError?: (ctx: PageContext<Ext>, error: any) => void | Promise<void>
}

export function definePlugin<Ext = {}>(plugin: MetaPlugin<Ext>): MetaPlugin<Ext> {
  return plugin
}

export class MetaRuntime<Ext = {}> {
  private plugins: MetaPlugin<Ext>[]

  constructor(plugins: MetaPlugin<Ext>[] = []) {
    this.plugins = plugins
  }

  createContext(routed: RoutedContext): PageContext<Ext> {
    const ctx = routed as PageContext<Ext>
    // DevTools: track context creation
    if (isDevEnv()) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      devHook('onContextCreated', id, 'PageContext', 'MetaRuntime')
    }
    // Allow plugins to extend/initialize
    for (const p of this.plugins) {
      try { p.onContextCreate?.(ctx) } catch (e) { /* swallow */ }
    }
    return ctx
  }

  async applyBeforeLoad(ctx: PageContext<Ext>): Promise<void> {
    for (const p of this.plugins) {
      if (p.onBeforeLoad) {
        await p.onBeforeLoad(ctx)
      }
    }
  }

  async applyAfterLoad<T>(ctx: PageContext<Ext>, data: T, setError: (e: any) => void): Promise<void> {
    for (const p of this.plugins) {
      if (p.onAfterLoad) {
        await p.onAfterLoad(ctx, data, setError)
      }
    }
  }

  async applyOnError(ctx: PageContext<Ext>, error: any): Promise<void> {
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