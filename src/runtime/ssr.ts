/**
 * @fileoverview Server-side rendering entry point for Auwla.
 *
 * Renders a matched route to an HTML string, resolving `routed` data and
 * invoking remote functions directly on the server.
 */



import { runtimeState } from './state';
import { isRenderClosure, isSsrNode } from './types';
import { __ssrNode } from '../compiler-runtime/ssr';
import { setCurrentPath } from '../router/navigation';
import { matchRoutes } from '../router/routes';
import { __setCurrentContext, __setCurrentLoader, __setCurrentMeta } from '../router/Router';
import { invokeRemoteServer } from '../server/ssr-invoke';
import type { SsrInvokeOptions } from '../server/ssr-invoke';
import { track, __extractTrackState, __resetTrackRegistry } from '../track/core';
import { setRpcRoutePath, setRpcRouteParams } from '../client/rpc';
import type { Route, RouteContext, MatchedRoute } from '../router/types';
import type { ServerManifest } from '../server/types';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { TrackHandle } from 'auwla/track';
import type { RouteError } from '../router/types';

type TrackStore = {
  registry: Map<string, any>;
  componentTracks: Map<string, Set<string>>;
  /** Per-request RPC dispatcher for SSR isolation. */
  rpcDispatcher: import('./rpc-dispatcher').RpcDispatcher | null;
};

type RouterStore = {
  currentContext: RouteContext | null;
  pendingContext: RouteContext | null;
  currentLoader: TrackHandle | null;
  currentMeta: Record<string, unknown> | null;
  currentError: RouteError | null;
};

const trackStorage = new AsyncLocalStorage<TrackStore>();
const routerStorage = new AsyncLocalStorage<RouterStore>();

(globalThis as any).__auwla_trackRegistryProvider = () => trackStorage.getStore()?.registry;
(globalThis as any).__auwla_trackComponentTracksProvider = () => trackStorage.getStore()?.componentTracks;

// Per-request RPC dispatcher provider — read by rpc-dispatcher.ts on every call.
(globalThis as any).__auwla_rpcDispatcherProvider = {
  get: () => trackStorage.getStore()?.rpcDispatcher ?? null,
  set: (d: import('./rpc-dispatcher').RpcDispatcher) => {
    const store = trackStorage.getStore();
    if (store) store.rpcDispatcher = d;
  },
  clear: () => {
    const store = trackStorage.getStore();
    if (store) store.rpcDispatcher = null;
  },
} satisfies import('./rpc-dispatcher').RpcDispatcherProvider;

(globalThis as any).__auwla_routerStoreProvider = {
  getCurrentContext: () => routerStorage.getStore()?.currentContext ?? null,
  setCurrentContext: (ctx: RouteContext<any> | null) => {
    const store = routerStorage.getStore()
    if (store) store.currentContext = ctx
  },
  getCurrentLoader: () => routerStorage.getStore()?.currentLoader ?? null,
  setCurrentLoader: (loader: TrackHandle | null) => {
    const store = routerStorage.getStore()
    if (store) store.currentLoader = loader
  },
  getCurrentMeta: () => routerStorage.getStore()?.currentMeta ?? null,
  setCurrentMeta: (meta: Record<string, unknown> | null) => {
    const store = routerStorage.getStore()
    if (store) store.currentMeta = meta
  },
  getCurrentError: () => routerStorage.getStore()?.currentError ?? null,
  setCurrentError: (error: RouteError | null) => {
    const store = routerStorage.getStore()
    if (store) store.currentError = error
  },
};

export interface SsrRenderOptions {
  manifest: ServerManifest;
  /** The incoming request. If omitted, a Request is synthesised from the URL. */
  request?: Request;
  /** Global middlewares applied to every remote function invocation. */
  globalMiddlewares?: SsrInvokeOptions['globalMiddlewares'];
  /** Custom module loader for server files. Defaults to dynamic import. */
  load?: (modulePath: string) => Promise<Record<string, unknown>>;
}

function createRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

function createRenderState(): import('./types').RenderState {
  return {
    instances: new Map(),
    memos: new Map(),
    seen: new Set(),
    rendered: new Set(),
    stack: ['root'],
    counters: new Map(),
    dirty: null,
    dirtySources: null,
    sourceDeps: new Map(),
    invalidate: () => {},
  };
}

/**
 * Render the route matching `url` to an HTML string.
 */
export async function renderToString(
  url: string,
  routes: Route[],
  options: SsrRenderOptions,
): Promise<{
  html: string;
  matched: MatchedRoute | null;
  data: Record<string, unknown>;
  status?: number;
  redirect?: string;
}> {
  const pathname = new URL(url, 'http://localhost').pathname + new URL(url, 'http://localhost').search;
  setCurrentPath(pathname);

  const matched = matchRoutes(routes, pathname);
  if (!matched) {
    return { html: '<div>404 — page not found</div>', matched: null, data: {} };
  }

  const { route, params, query } = matched;
  const request = options.request ?? createRequest(url);

  const dispatcher = (key: string, args: unknown[], routePath: string, rpcOptions?: any) =>
    invokeRemoteServer(
      options.manifest,
      key,
      args,
      routePath,
      request,
      {
        method: rpcOptions?.method,
        signal: rpcOptions?.signal,
        globalMiddlewares: options.globalMiddlewares,
        load: options.load,
      },
    );

  const previousRenderState = runtimeState.activeRenderState;
  const renderState = createRenderState();

  // Pass the dispatcher directly as part of the initial ALS store so it is
  // available the moment the run() callback executes. The ALS scope handles
  // cleanup automatically — no save/restore dance needed.
  return trackStorage.run({ registry: new Map(), componentTracks: new Map(), rpcDispatcher: dispatcher }, () => {
    return routerStorage.run({
      currentContext: null,
      pendingContext: null,
      currentLoader: null,
      currentMeta: null,
      currentError: null,
    }, async () => {
      const context: RouteContext<any> = {
        path: pathname,
        params,
        query,
        state: {},
        tag: () => {},
      };

      const prevPath = setRpcRoutePath(context.path);
      const prevParams = setRpcRouteParams(context.params);

      __setCurrentContext(context);
      __setCurrentMeta(route.meta ?? null);

      let loaderHandle: import('../track').TrackHandle | null = null;

      try {
        // Run route guard if present (and options.request was provided, indicating it's a live request)
        if (options.request && route.guard) {
          const result = await route.guard(context);
          if (result === false) {
            return {
              html: '<div>403 — access denied</div>',
              matched,
              data: {},
              status: 403,
            };
          }
          if (typeof result === 'string') {
            return {
              html: '',
              matched,
              data: {},
              redirect: result,
            };
          }
        }

        if (route.routed) {
          loaderHandle = track(`__loader:${context.path}`, (signal) => route.routed!(context, signal), undefined, true);
          await loaderHandle;
        }

        // Assign activeRenderState *after* the await to avoid concurrent requests
        // overwriting it while yielded to the event loop.
        runtimeState.activeRenderState = renderState;
        __setCurrentLoader(loaderHandle);

        const RouteComp = route.component;
        const output = RouteComp();
        const rendered = isRenderClosure(output) ? output() : output;

        let html: string;
        if (typeof rendered === 'string') {
          html = rendered;
        } else if (isSsrNode(rendered)) {
          html = __ssrNode(rendered);
        } else if (rendered == null) {
          html = '';
        } else {
          html = __ssrNode(rendered);
        }

        const trackData = __extractTrackState();
        const scriptTag = `<script>window.__AUWLA_DATA__ = ${JSON.stringify(trackData).replace(/</g, '\\u003c')};</script>`;

        html += scriptTag;

        return { html, matched, data: trackData };
      } finally {
        setRpcRoutePath(prevPath);
        setRpcRouteParams(prevParams);
        runtimeState.activeRenderState = previousRenderState;
        // The ALS store is scoped to this run() callback so the dispatcher is
        // automatically discarded when it exits — no explicit clearRpcDispatcher needed.
        __setCurrentContext(null);
        __setCurrentLoader(null);
        __setCurrentMeta(null);
        __resetTrackRegistry();
      }
    });
  });
}
