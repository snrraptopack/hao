# Type-Safe Routing and Autocomplete

This guide shows how to enable editor autocomplete for routes and get type errors for unknown paths or names when using `Link`, `router.push`, `router.replace`, and `router.pushNamed`.

## Overview
- Autocompletion for all registered paths when typing `Link({ to: ... })` and `router.push(...)`.
- Params are inferred from the selected path pattern (e.g., `/app/users/:id` requires `{ id }`).
- Red underline for unknown paths or names not present in your `allRoutes` composition.
- Optional trailing slash is tolerated at runtime (e.g., `/app/home` and `/app/home/` match the same route).

## Prerequisites
- Define your routes with `defineRoutes`, group with `group`, and compose into a single `allRoutes` export in `src/app/routes.tsx`.
- Keep `allRoutes` up to date; the type registry derives from it.

## Step 1 — Register route unions via ambient types
Create `src/app/route-types.d.ts` in your app and add:

```ts
// Ambient augmentation that supplies the union of registered route paths
// and names derived from the app's composed routes.
type AllRoutes = typeof import('./routes').allRoutes;

declare global {
  interface AuwlaRouterAppPaths {
    // String paths only (exclude RegExp routes)
    paths: Extract<AllRoutes[number]['path'], string>;
    // Named routes (optional)
    names: Extract<AllRoutes[number]['name'], string>;
  }
}
```

Restart your editor’s TypeScript server to pick up the ambient types.

## Step 2 — Use typed routing APIs
- `Link` with autocompletion and inferred params:

```tsx
import { Link } from 'auwla'

// Static path
<Link to="/app/home" text="Home" />

// Dynamic path with typed params
<Link to="/app/users/:id" params={{ id: 123 }} text="View User" />
```

- Programmatic navigation with autocompletion:

```ts
import { useRouter } from 'auwla'
import { pathFor } from 'auwla'

const router = useRouter()

// Static path
router.push('/app/home')

// With query
router.replace('/app/search?q=laptop')

// Dynamic via pathFor
router.push(pathFor('/app/users/:id', { id: 42 }))
```

- Named routes (if you provided `name` in your route definitions):

```ts
router.pushNamed('user-detail', { id: 42 })
```

## Validation behavior
- Unknown `to` or `router.push(...)` path → type error.
- Unknown `pushNamed(...)` name → type error.
- Missing required `params` for dynamic paths → type error.

## Troubleshooting
- Restart the TypeScript server after adding `route-types.d.ts`.
- Ensure your app exports `allRoutes` from `src/app/routes.tsx` and that file is included in your `tsconfig.json`.
- Autocompletion appears when you pass a literal or a typed constant to `to`/`push`. If the variable is typed as `string`, completions won’t show.

## Notes
- Numbers in `params` are allowed; they are URL-encoded when building paths.
- Runtime matching tolerates an optional trailing slash for non-root paths.
- Regex routes are not included in the autocompletion union.

## Publishing guidance
When using Auwla as a library, instruct app authors to:
- Export their composed `allRoutes`.
- Add the ambient file shown above (`src/app/route-types.d.ts`).
- Restart TypeScript to activate autocompletion.