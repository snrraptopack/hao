import type { Route, MatchedRoute } from "./types"

const registry: Route[] = []

export function defineRoutes(rs: Route[]) {
  registry.push(...flattenRoutes(rs))
}

function flattenRoutes(routes: Route[], prefix = ""): Route[] {
  const flat: Route[] = []
  for (const route of routes) {
    const fullPath = normalizePath(prefix + route.path)
    if (route.children?.length) {
      flat.push(...flattenRoutes(route.children, fullPath))
    } else {
      flat.push({ ...route, path: fullPath })
    }
  }
  return flat
}

function normalizePath(path: string) {
  return "/" + path.replace(/^\/+|\/+$/g, "")
}

function pathToRegex(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = []
  const pattern = path
    .replace(/\//g, "\\/")
    .replace(/:([a-zA-Z]+)/g, (_, key) => {
      keys.push(key)
      return "([^/]+)"
    })
    .replace(/\*/g, ".*")
  return { regex: new RegExp(`^${pattern}$`), keys }
}

export function matchRoute(pathname: string): MatchedRoute | null {
  const [pathOnly, queryString] = pathname.split("?")
  const query = parseQuery(queryString ?? "")

  // wildcard last
  const sorted = [...registry].sort((a, b) =>
    a.path === "*" ? 1 : b.path === "*" ? -1 : 0
  )

  for (const route of sorted) {
    const { regex, keys } = pathToRegex(route.path)
    const match = pathOnly?.match(regex)
    if (match) {
      const params: Record<string, string> = {}
      keys.forEach((key, i) => (params[key] = match[i + 1]))
      return { route, params, query }
    }
  }
  return null
}

function parseQuery(qs: string): Record<string, string> {
  if (!qs) return {}
  return Object.fromEntries(new URLSearchParams(qs))
}
