=<Header>
title: Runtime API Reference
=</Header>

# Runtime API Reference

This page lists the public exports from `auwla` and its subpackages. Internal compiler-runtime helpers (prefixed with `__`) are used by generated code and can be ignored in normal apps.

---

## `auwla` — Core Runtime

### App lifecycle

| Export | Description |
| :--- | :--- |
| `createMemoApp(root, element)` | Mount an Auwla app into a DOM node. |
| `component()` | Get a handle to the current component instance. Pass it to `commit(handle)` for scoped re-renders. |
| `commit()` | Schedule a re-render of all mounted apps. |
| `commit(handle)` | Schedule a re-render of only the given component subtree. |
| `cleanup(fn)` | Register a function to run when the component unmounts. |
| `emit(handle, name, payload?)` | Emit a custom event that bubbles up to ancestor `emit:name` listeners. |

### JSX / DOM

| Export | Description |
| :--- | :--- |
| `h(type, props, ...children)` | JSX factory. Used by the runtime when the compiler bails out. |
| `Fragment` | JSX fragment marker. |
| `createMemoElement(type, props, ...children)` | Lower-level element constructor. |

### Reactive primitives

| Export | Description |
| :--- | :--- |
| `reactive(initialValue)` | Create a reactive cell with `.get()` and `.set()`. Components that read `.get()` in their render closure auto-subscribe. |
| `memo(factory)` | Create a memoized computation. |

---

## `auwla/events` — Event Modifiers

| Export | Description |
| :--- | :--- |
| `event` | The default event chain builder. Start every modifier chain with this. |
| `emit` | Also re-exported here for convenience. |
| `DEFAULT_EVENT_DELAY_MS` | Default delay used by timing modifiers. |

See the [Event Modifiers](./event-modifiers) guide for the full modifier list.

---

## `auwla/track` — Async Tracking

| Export | Description |
| :--- | :--- |
| `track(name, promise)` | Track a promise by name. Returns a `TrackHandle`. |
| `track(name, asyncFn)` | Track an async function. Auto-runs and provides an `AbortSignal`. |
| `track.get(key, options?)` | Call a remote GET server function. |
| `track.post(key, options?)` | Create a lazy POST command handle. Call `.run()` to execute. |
| `track.form(key, options?)` | Bind a form to a POST remote. Returns a `FormHandle` with `.onSubmit`, `.props`, etc. |
| `pending(name?)` | Check if a named track is pending. |
| `resolved(name?)` / `rejected(name?)` | Check resolved/rejected state. |
| `value(name?)` / `reason(name?)` | Read the resolved value or rejection reason. |
| `cancel(name?)` | Cancel an in-flight track. |

See the [Async & Data](./async-lifecycle) guide.

---

## `auwla/router` — Routing

| Export | Description |
| :--- | :--- |
| `Router` | Route outlet component. |
| `Link` | Anchor with client-side navigation. |
| `Outlet` | Renders nested child routes. |
| `defineRoutes(routes)` | Explicit route table builder. |
| `group(path, options, routes)` | Group routes under a shared layout/guard. |
| `composeRoutes(...routeArrays)` | Merge multiple route arrays. |
| `navigate(path, params?, opts?)` | Programmatic navigation. |
| `back()` / `forward()` | History navigation. |
| `getParams()` | Read current route params. |
| `getQuery()` | Read current query string. |
| `getLocation()` | Read current path. |
| `getRouteMeta()` | Read matched route metadata. |
| `getRouted(fn?)` | Read the typed loader handle. |
| `getLoaderHandle()` | Raw loader handle. |
| `getRouteError()` | Structured error, only valid inside error components. |
| `isActive(path)` / `isExactActive(path)` | Active route checks. |
| `pathFor(path, params?)` | Build a path string. |
| `afterEach(fn)` | Register a post-navigation hook. |
| `invalidate(options)` | Clear route cache by tag or path. |
| `prefetchRoute(path)` | Prefetch a route chunk. |
| `registerPrefetches(map)` / `prefetchRoute(path)` | Prefetch control. |
| `configureSuspense(options)` / `isSuspended()` / `enterSuspense()` / `exitSuspense()` | Suspend helpers. |

See the [Router](./router) guide.

---

## `auwla/server` — RPC Server

| Export | Description |
| :--- | :--- |
| `remote.get(middlewares?, handler)` | Define a GET remote function. |
| `remote.post(middlewares?, handler)` | Define a POST remote function. |
| `remote.put` / `remote.patch` / `remote.delete` | Other HTTP methods. |
| `validate(schema)` | Standard Schema middleware. |
| `defineMiddleware(fn)` | Create typed middleware. |
| `getParams()` | Read route params inside a server function. |
| `getContext()` | Access the current server context. |
| `NotFoundError` / `UnauthorizedError` / `BadRequestError` | Common HTTP errors. |

See the [Server Functions](./server-functions) guide.

---

## `auwla/adapters/*` — Server Adapters

| Export | Description |
| :--- | :--- |
| `createFetchAdapter(options)` | Core WinterCG-compatible adapter. |
| `createBunAdapter(options)` | Bun.serve adapter. |
| `createHonoAdapter(options)` | Hono middleware adapter. |

The Express adapter is intentionally deferred; use `createFetchAdapter` or `createHonoAdapter` for now.

---

## `auwla/css` — Styling

| Export | Description |
| :--- | :--- |
| `css(styleObject)` | Resolve a style object for the `style` attribute. |
| `merge(...styles)` / `extend(base, overrides)` / `define(style)` | Composition helpers. |
| `when`, `match`, `mergeWhen` | Conditional helpers. |
| `px`, `rem`, `pct`, `ms`, `deg`, etc. | Typed unit helpers. |
| `color`, `gradient` | Color helpers. |
| `border`, `shadow`, `transform`, `transition`, `ease`, `outline` | Composite values. |
| `grid`, `flex` | Layout descriptors. |

See the [CSS & Styling](./css) guide.

---

## `auwla/vite` — Build Plugin

| Export | Description |
| :--- | :--- |
| `auwla(options?)` | Vite plugin. Options include `serverEntry`, `debugFlag`, and SSR flags. |

---

## `auwla/vite-router` — File-Based Router Plugin

| Export | Description |
| :--- | :--- |
| `auwlaRouter(options?)` | Vite plugin. Options include `dir`, `genFile`, `lazy`, `extensions`. |
