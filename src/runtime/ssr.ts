/**
 * @fileoverview Server-side rendering entry point for Auwla.
 *
 * Renders a matched route to an HTML string, resolving `routed` data and
 * invoking remote functions directly on the server.
 */



if (typeof globalThis.Node === 'undefined') {
  class MockNode {
    static ELEMENT_NODE = 1;
    static ATTRIBUTE_NODE = 2;
    static TEXT_NODE = 3;
    static CDATA_SECTION_NODE = 4;
    static ENTITY_REFERENCE_NODE = 5;
    static ENTITY_NODE = 6;
    static PROCESSING_INSTRUCTION_NODE = 7;
    static COMMENT_NODE = 8;
    static DOCUMENT_NODE = 9;
    static DOCUMENT_TYPE_NODE = 10;
    static DOCUMENT_FRAGMENT_NODE = 11;
    static NOTATION_NODE = 12;

    nodeType!: number;
    textContent?: string;
    childNodes: any[] = [];
    props = {} as Record<string, any>;
    style = {} as Record<string, string>;

    get children() {
      return this.childNodes;
    }

    get classList() {
      const self = this;
      return {
        add(...names: string[]) {
          const current = self.getAttribute('class') || '';
          const parts = current.split(/\s+/).filter(Boolean);
          for (const name of names) {
            if (!parts.includes(name)) parts.push(name);
          }
          self.setAttribute('class', parts.join(' '));
        },
        remove(...names: string[]) {
          const current = self.getAttribute('class') || '';
          const parts = current.split(/\s+/).filter(Boolean);
          const filtered = parts.filter(p => !names.includes(p));
          self.setAttribute('class', filtered.join(' '));
        },
        contains(name: string) {
          const current = self.getAttribute('class') || '';
          return current.split(/\s+/).includes(name);
        },
        toggle(name: string, force?: boolean) {
          const has = this.contains(name);
          const want = force !== undefined ? force : !has;
          if (want) this.add(name);
          else this.remove(name);
          return want;
        }
      };
    }

    getAttribute(name: string) {
      const val = this.props[name];
      return val === undefined ? null : String(val);
    }

    setAttribute(name: string, value: any) {
      this.props[name] = value;
    }

    removeAttribute(name: string) {
      delete this.props[name];
    }

    hasAttribute(name: string) {
      return name in this.props;
    }

    appendChild(child: any) {
      this.childNodes.push(child);
      return child;
    }

    append(...children: any[]) {
      this.childNodes.push(...children);
    }

    prepend(...children: any[]) {
      this.childNodes.unshift(...children);
    }

    insertBefore(newChild: any, refChild: any) {
      if (!refChild) {
        this.appendChild(newChild);
        return newChild;
      }
      const index = this.childNodes.indexOf(refChild);
      if (index === -1) {
        this.appendChild(newChild);
      } else {
        this.childNodes.splice(index, 0, newChild);
      }
      return newChild;
    }

    removeChild(child: any) {
      const index = this.childNodes.indexOf(child);
      if (index !== -1) {
        this.childNodes.splice(index, 1);
      }
      return child;
    }

    replaceChild(newChild: any, oldChild: any) {
      const index = this.childNodes.indexOf(oldChild);
      if (index !== -1) {
        this.childNodes.splice(index, 1, newChild);
      }
      return oldChild;
    }
  }
  (globalThis as any).Node = MockNode;
}

if (typeof globalThis.SVGElement === 'undefined') {
  class MockSVGElement extends (globalThis as any).Node {}
  (globalThis as any).SVGElement = MockSVGElement;
}

if (typeof globalThis.DocumentFragment === 'undefined') {
  class MockDocumentFragment extends (globalThis as any).Node {}
  (globalThis as any).DocumentFragment = MockDocumentFragment;
}

if (typeof globalThis.document === 'undefined') {
  const SVG_TAGS = new Set([
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'text', 'tspan', 'defs', 'use', 'clipPath', 'mask', 'pattern', 'linearGradient',
    'radialGradient', 'stop', 'image', 'foreignObject',
  ]);

  const createMockElement = (tag: string) => {
    const BaseClass = SVG_TAGS.has(tag) ? (globalThis as any).SVGElement : (globalThis as any).Node;

    class MockElement extends BaseClass {
      __auwlaSsr = true;
      nodeType = 1;
      tag = tag.toLowerCase();
      tagName = tag.toUpperCase();

      addEventListener() {}
    }

    const rawEl = new MockElement();

    return new Proxy(rawEl, {
      get(target: any, prop: string) {
        if (prop in target) return target[prop];
        if (prop === 'className') return target.props.class || '';
        return target.props[prop];
      },
      set(target: any, prop: string, value: any) {
        if (prop in target) {
          target[prop] = value;
        } else if (prop === 'className') {
          target.props.class = value;
        } else {
          target.props[prop] = value;
        }
        return true;
      }
    });
  };

  (globalThis as any).document = {
    createElement(tag: string) {
      if (tag === 'template') {
        class MockTemplate extends (globalThis as any).Node {
          nodeType = 1;
          tagName = 'TEMPLATE';
          content = new (globalThis as any).DocumentFragment();
        }
        return new MockTemplate();
      }
      return createMockElement(tag);
    },
    createElementNS(_ns: string, tag: string) {
      return createMockElement(tag);
    },
    createComment(data: string) {
      class MockComment extends (globalThis as any).Node {
        nodeType = 8;
        textContent = data;
      }
      return new MockComment();
    },
    createTextNode(text: string) {
      class MockText extends (globalThis as any).Node {
        nodeType = 3;
        textContent = text;
      }
      return new MockText();
    },
    createDocumentFragment() {
      class MockFragment extends (globalThis as any).DocumentFragment {
        nodeType = 11;
      }
      return new MockFragment();
    }
  };
}

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
  headTags?: string[];
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
