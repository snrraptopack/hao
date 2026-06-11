// navigation.d.ts
export {}

declare global {
  interface NavigateEvent extends Event {
    readonly canIntercept: boolean
    readonly hashChange: boolean
    readonly downloadRequest: string | null
    readonly destination: { url: string }
    readonly navigationType: 'push' | 'replace' | 'reload' | 'traverse'
    intercept(options: { handler: () => void | Promise<void> }): void
  }

  interface Navigation extends EventTarget {
    navigate(url: string, options?: { history?: 'auto' | 'push' | 'replace' }): void
    addEventListener(type: "navigate", listener: (e: NavigateEvent) => void): void
    back(): void
    forward(): void
  }

  interface Window {
    navigation: Navigation
  }
}
