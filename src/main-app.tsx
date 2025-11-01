import { createApp } from './app'
import { allRoutes } from './app/routes'
import type { Route } from './router'

// allRoutes is a readonly composition; create a mutable copy for Router
const routesMutable: Route[] = (allRoutes as unknown as ReadonlyArray<Route>).slice()


const app = createApp({ routes: routesMutable, target: '#app' })
app.mount()
