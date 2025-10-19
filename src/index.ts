// Core Reactivity
export { ref, watch } from './state';
export type { Ref } from './state';

// Component and Lifecycle
export { Component } from './dsl';
export { onMount, onUnmount } from './lifecycle';

// UI DSL
export { LayoutBuilder } from './dsl';

// Router
export { Router, setRouter, Link, useParams, useQuery, useRouter } from "./router"
export type { Route as RouteConfig } from "./router"

// App
export { createApp } from './app'
export type { App, AppConfig } from './app'

// Element Creator (for advanced use)
export { el } from './createElement';
export type { EventHandlers, EventMap } from './createElement';
