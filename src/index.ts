// Note: Global JSX types are provided via auwla/jsx-runtime for automatic JSX.

// Core reactive system
export { ref, watch, flushSync, flush } from './state';
export type { Ref } from './state';

// JSX runtime
export { h, Fragment } from './jsx';

// Component system
export { Component } from './dsl';
export type { LayoutBuilder } from './dsl';

// Lifecycle hooks
export { onMount, onUnmount } from './lifecycle';

// Context management
export { createContext, Provider, useContext, useReactiveContext, setGlobalContext, type Context } from './context';

// DevTools (development only)
export { initDevTools, getDevTools } from './devtools';
export { enableDevToolsOverlay } from './devtools-ui';

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