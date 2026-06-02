// router.ts
import { commit, component } from "auwla"
import {JSX} from "auwla/jsx-runtime"

type Route = {
  path: string
  component: () => JSX.Element
}

let currentPath = window.location.pathname
const routes: Route[] = []

export function defineRoutes(rs: Route[]) {
  routes.push(...rs)
}

export function navigate(path: string) {
  window.navigation.navigate(path)
}

export function Router() {
  const self = component()

  window.navigation.addEventListener("navigate", (e: NavigateEvent) => {
    if (!e.canIntercept || e.hashChange || e.downloadRequest) return
    const url = new URL(e.destination.url)
    e.intercept({
      handler() {
        currentPath = url.pathname
        commit(self)
      }
    })
  })

  return () => {
    const match = routes.find(r => r.path === currentPath)
    if (!match) return <div>404</div>
    const Page = match.component
    return <Page />
  }
}
