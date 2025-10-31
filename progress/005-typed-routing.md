Typed Routing Improvements (005)

What changed
- Router is now generic over the routes array, enabling type-safe navigation by name and param inference.
- pushNamed(name, params) and pathForNamed(name, params, query) derive their types from the provided routes.
- A typed pathFor(pattern, params, query) helper was added to routes.ts for building URLs from literal patterns.
- Route definitions support optional paramDecoders to coerce matched params (e.g., number) and an optional prefetch hook for warming caches.
- Link now accepts a string pattern and infers PathParams<P> for typed param replacement when you pass a literal pattern.

Why it’s better
- Eliminates brittle ambient RegisteredPath/RegisteredName declarations by deriving names/paths from actual route arrays.
- Compile-time safety for named navigation: you can only pass params that match the route’s path segments.
- Clear path building API that keeps params and query encoding consistent.
- Optional param decoding lets you work with numbers and custom formats without manual parsing in each component.
- Prefetch hooks allow route-level data warming (ideal for integrating with createResource) without coupling Router to data layer specifics.

How to use it
1) Define routes with names and optional decoders/prefetch hooks
```ts
import { defineRoutes, pathFor } from '../src/routes'
import { Router } from '../src/router'

const routes = defineRoutes([
  {
    path: '/users/:id',
    name: 'user',
    component: (p) => UserPage(p!.id),
    // Decode the ":id" segment to a number
    paramDecoders: { id: 'number' },
    // Optionally prefetch route data ahead of navigation
    prefetch: async (params) => {
      // e.g., createResource('user:' + params!.id, ...)
    },
  },
  { path: '/search', name: 'search', component: () => SearchPage() },
])

const router = new Router(routes, document.getElementById('app')!)
router.start()

// Programmatic navigation with name and params
router.pushNamed('user', { id: 42 })

// Build a URL for links or external navigation
const url = pathFor('/users/:id', { id: 42 }, { tab: 'posts' })

// Prefetch by route name (calls route.prefetch if provided)
router.prefetchNamed('user', { id: 42 })
```

2) Typed Link usage (pattern-based)
```ts
import { Link } from '../src/router'

ui.append(
  Link({
    to: '/users/:id',
    params: { id: 42 },
    text: 'Profile',
    activeClassName: 'font-bold underline',
  })
)
```

Notes and best practices
- Prefer defining route names on all user-facing routes to enable pushNamed and pathForNamed usage.
- Keep param names descriptive and consistent across components; decoding is optional but recommended for numeric ids.
- pathFor(pattern, params, query) encodes query values as strings; ensure numbers/dates are stringified as needed.
- Route guard warnings are gated behind isDevEnv(); adjust your test environment accordingly if you prefer silent runs.

Interoperability
- Works seamlessly with createResource: use route.prefetch to warm caches; route.routed can read/write router.state.
- Existing Router APIs (push, replace, back, forward) remain unchanged; named navigation is additive.

Testing notes
- Added tests/typed-routing.test.ts to verify pathFor replaces params and appends query strings correctly.
- Existing router tests continue to pass; typed additions do not change runtime behavior.