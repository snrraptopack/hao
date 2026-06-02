import { commit } from "auwla"
import type { ComponentHandle } from "auwla"

let routerHandle: ComponentHandle | null = null
let _currentPath = window.location.pathname + window.location.search

export function getCurrentPath() {
  return _currentPath
}

export function registerRouter(handle: ComponentHandle) {
  routerHandle = handle
}

export function navigate(path: string) {
  window.navigation.navigate(path)
}

export function back() {
  window.navigation.back()
}

export function forward() {
  window.navigation.forward()
}

export function initNavigation() {
  window.navigation.addEventListener("navigate", (e: NavigateEvent) => {
    if (!e.canIntercept || e.hashChange || e.downloadRequest) return
    const url = new URL(e.destination.url)
    e.intercept({
      handler() {
        _currentPath = url.pathname + url.search
        if (routerHandle) commit(routerHandle)
      },
    })
  })
}
