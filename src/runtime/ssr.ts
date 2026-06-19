/**
 * @fileoverview Server-side rendering entry point for Auwla.
 *
 * Renders a matched route to an HTML string, resolving `routed` data and
 * invoking remote functions directly on the server.
 */

import { setRpcDispatcher, clearRpcDispatcher, getRpcDispatcher } from './rpc-dispatcher';
import { runtimeState } from './state';
import { isRenderClosure, isSsrNode } from './types';
import { __ssrNode } from '../compiler-runtime/ssr';
import { setCurrentPath } from '../router/navigation';
import { matchRoutes } from '../router/routes';
import { __setCurrentContext, __setCurrentLoader, __setCurrentMeta } from '../router/Router';
import { invokeRemoteServer } from '../server/ssr-invoke';
import type { SsrInvokeOptions } from '../server/ssr-invoke';
import { track, __extractTrackState, __resetTrackRegistry } from '../track/core';
import type { Route, RouteContext, MatchedRoute } from '../router/types';
import type { ServerManifest } from '../server/types';

export interface SsrRenderOptions {
  /** Server manifest mapping remote keys to their implementations. */
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
): Promise<{ html: string; matched: MatchedRoute | null; data: Record<string, unknown> }> {
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

  const previousDispatcher = getRpcDispatcher();
  setRpcDispatcher(dispatcher);

  const previousRenderState = runtimeState.activeRenderState;
  const renderState = createRenderState();

  const context: RouteContext<any> = {
    path: pathname,
    params,
    query,
    state: {},
    tag: () => {},
  };

  __setCurrentContext(context);
  __setCurrentMeta(route.meta ?? null);

  let loaderHandle: import('../track').TrackHandle | null = null;

  try {
    if (route.routed) {
      loaderHandle = track(`__loader:${context.path}`, (signal) => route.routed!(context, signal));
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
    runtimeState.activeRenderState = previousRenderState;
    clearRpcDispatcher();
    if (previousDispatcher) {
      setRpcDispatcher(previousDispatcher);
    }
    __setCurrentContext(null);
    __setCurrentLoader(null);
    __setCurrentMeta(null);
    __resetTrackRegistry();
  }
}
