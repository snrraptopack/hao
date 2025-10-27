# Changelog

## Unreleased

- Router: Add type-level param inference for string paths.
  - New utility types `PathParamNames<S>` and `PathParams<S>` infer parameter keys from patterns like `/users/:id/:tab`.
  - `Route<P extends string | RegExp>` and `RouteMatch<P>` are now generic; string paths yield strongly-typed `params`, RegExp routes continue to use `Record<string,string>`.
  - `Router.add()` updated to be generic and preserve typing for the `component` callback.

- Link: Support `params` and `query` for building `href`.
  - Replaces `:param` placeholders and appends query strings.
  - Renders as an anchor (`<a>`) with `href` for better semantics and accessibility.
  - Applies `activeClassName` based on current path (ignoring query).

- Public API: Export router primitives from `src/index.ts`.
  - `Router`, `Link`, `useRouter`, `useParams`, `useQuery`, `setRouter`, `getRouter` are now re-exported for consumers.

- JSX Utils: Confirm `When` and `For` return `HTMLElement`.
  - Ensures typings align with DOM usage across the framework.

- DSL Safety: Hardened attribute handling for `text` and `value` when provided as `number`.
  - Numbers are converted to strings; reactive refs are subscribed to correctly.

- Performance & Safety: Strengthened `lis` (Longest Increasing Subsequence) helpers to satisfy `noUncheckedIndexedAccess`.
  - Added non-null assertions and guards in both `src/jsxutils.tsx` and `src/dsl.ts`.

- Route Composition Helpers: `defineRoutes`, `composeRoutes`, `group`, `pathFor` in `src/routes.ts`.
  - Enable modular, JSX-first route definitions and explicit path building.
  - `group()` prefixes child paths and can apply a shared `guard` and optional `layout`.

- Route Lifecycle: `routed(state, params, prev)` on `Route`.
  - Runs before component render and may return a cleanup function executed when navigating away.
  - Useful for fetching/caching, analytics, and per-route setup/teardown.

- Optional Route Layout: `layout(child, params, query)` on `Route`.
  - If provided, wraps the page component output to compose shared UI.