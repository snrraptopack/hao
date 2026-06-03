// navigation.d.ts
interface NavigateEvent extends Event {
  canIntercept: boolean
  hashChange: boolean
  downloadRequest: string | null
  destination: { url: string }
  // 'push' | 'replace' | 'reload' | 'traverse' (traverse = back/forward)
  navigationType: 'push' | 'replace' | 'reload' | 'traverse'
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
