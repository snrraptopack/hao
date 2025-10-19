import { Router, setRouter, type Route } from './router'

export interface AppConfig {
  router?: Router
  routes?: Route[]
  target: string | HTMLElement
}

export interface App {
  mount(): void
  unmount(): void
}

/**
 * Create an Auwla application
 * 
 * @example
 * ```typescript
 * const app = createApp({
 *   router: new Router(routes),
 *   target: '#app'
 * })
 * 
 * app.mount()
 * ```
 */
export function createApp(config: AppConfig): App {
  let container: HTMLElement
  
  if (typeof config.target === 'string') {
    const element = document.querySelector(config.target)
    if (!element) {
      throw new Error(`Target element "${config.target}" not found`)
    }
    container = element as HTMLElement
  } else {
    container = config.target
  }
  
  // Create router if not provided
  const router = config.router || new Router(config.routes || [], container)
  
  // Set the global router instance
  setRouter(router)
  
  return {
    mount() {
      router.start()
    },
    
    unmount() {
      container.innerHTML = ''
    }
  }
}