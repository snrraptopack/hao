// Note: Global JSX types are provided via auwla/jsx-runtime for automatic JSX.

// Core reactive system
export { ref, watch, watchEffect, derive, flushSync, flush, batch, untracked } from './state';
export type { Ref } from './state';
// Structured local state
export { createStore } from './store';
export type { Store, SubStore } from './store';

// JSX runtime
export { h, Fragment } from './jsx';

// JSX utilities
export { When,For } from './jsxutils';

// Component system
export { Component } from './dsl';
export type { LayoutBuilder } from './dsl';

// Lifecycle hooks
export { onMount, onUnmount } from './lifecycle';

// Context management
export { createContext, Provider, useContext, useReactiveContext, setGlobalContext, type Context } from './context';

// DevTools (development only)
export { initDevTools, getDevTools } from './devtools';
export { enableDevToolsOverlay, disableDevToolsOverlay } from './devtools-ui';

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
  ParamDecoder,
} from './router'

// Routing helpers
export { defineRoutes, composeRoutes, group, pathFor } from './routes'

// Data fetching helpers
export { fetch, asyncOp } from './fetch'
export { createResource } from './resource'
export type { FetchState } from './fetch'
export type { Resource } from './resource'

// Optional integrations are available as separate imports:
// import { ReactIsland, createReactIsland } from 'auwla/integrations/react'