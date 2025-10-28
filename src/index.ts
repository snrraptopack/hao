// Note: Global JSX types are provided via auwla/jsx-runtime for automatic JSX.

// Core state
export { ref, watch, flushSync, flush } from './state'
export type { Ref } from './state'

// Core DSL / JSX
export { Component } from './dsl'
export type { LayoutBuilder } from './dsl'
export { h, Fragment } from './jsx'
export { For, When } from './jsxutils'

// Lifecycle
export { onMount, onUnmount, onRouted } from './lifecycle'

// Routing
export { Router, Link, useRouter, useParams, useQuery, setRouter, getRouter } from './router'
export type {
  Route,
  RouteMatch,
  RouteParams,
  QueryParams,
  PathParams,
  RouteGuard,
  RoutedContext,
} from './router'

// Routing helpers
export { defineRoutes, composeRoutes, group, pathFor } from './routes'

// Data fetching helpers
export { fetch, asyncOp } from './fetch'
export type { FetchState } from './fetch'

// Optional integrations
export { ReactIsland, createReactIsland } from './integrations/react'