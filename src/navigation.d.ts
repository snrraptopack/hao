// navigation.d.ts  (create this in your src folder)
interface NavigateEvent extends Event {
  canIntercept: boolean
  hashChange: boolean
  downloadRequest: string | null
  destination: { url: string }
  intercept(options: { handler: () => void | Promise<void> }): void
}

interface Navigation extends EventTarget {
  navigate(url: string): void
  addEventListener(type: "navigate", listener: (e: NavigateEvent) => void): void
}

interface Window {
  navigation: Navigation
}
