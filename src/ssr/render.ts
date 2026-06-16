/**
 * @fileoverview Server-side rendering entry point.
 *
 * Renders an Auwla app to an HTML string inside a minimal DOM environment.
 * Supports async server functions via a flush loop: promises created during
 * render are awaited, then the app is re-rendered until no new promises are
 * produced or a maximum number of passes is reached.
 */

import { installDomShim } from './dom-shim';
import { serializeNode } from './serialize';
import { createSsrContext, type SsrContextOptions } from './context';
import { setSsrContext } from './invoker';
import { runtimeState } from '../runtime/state';
import { toNode } from '../runtime/dom';
import { setCurrentPath } from '../router/navigation';
import { setRpcRoutePath, setRpcRouteParams } from '../client/rpc';
import type { RenderClosure } from '../runtime/types';

export interface RenderToStringOptions extends SsrContextOptions {
  /** Active route path (defaults to '/'). */
  path?: string;
  /** Active route parameters. */
  params?: Record<string, string | string[]>;
  /** Maximum number of async flush passes (defaults to 10). */
  maxFlush?: number;
}

const DEFAULT_MAX_FLUSH = 10;

function createSsrRenderState(): import('../runtime/types').RenderState {
  return {
    instances: new Map(),
    memos: new Map(),
    seen: new Set(),
    rendered: new Set(),
    stack: ['root'],
    counters: new Map(),
    dirty: new Set(),
    dirtySources: new Set(),
    sourceDeps: new Map(),
    invalidate: () => {
      // SSR renders are one-shot; invalidations are handled by the flush loop.
    },
  };
}

/**
 * Render an Auwla app to an HTML string.
 *
 * Accepts a render closure (the result of JSX like `<App />`) or any value
 * that `toNode` understands. Server functions resolved during the render are
 * awaited and the render is retried until the output is stable.
 */
export async function renderToString(
  app: RenderClosure | (() => unknown) | unknown,
  options: RenderToStringOptions = {},
): Promise<string> {
  installDomShim();

  const context = createSsrContext(options);
  setSsrContext(context);

  const path = options.path ?? '/';
  setCurrentPath(path);
  setRpcRoutePath(path);
  setRpcRouteParams(options.params ?? {});

  const maxFlush = options.maxFlush ?? DEFAULT_MAX_FLUSH;

  try {
    let html = '';

    for (let pass = 0; pass < maxFlush; pass++) {
      context.pending.clear();

      const previousRenderState = runtimeState.activeRenderState;
      const previousEventWrapper = runtimeState.activeEventWrapper;
      const previousSetupId = runtimeState.activeSetupComponentId;
      const renderState = createSsrRenderState();
      runtimeState.activeRenderState = renderState;
      runtimeState.activeEventWrapper = (handler) => handler as EventListener;
      runtimeState.activeSetupComponentId = null;

      try {
        const output = typeof app === 'function' ? (app as () => unknown)() : app;
        const node = toNode(output);
        html = serializeNode(node as any);
      } finally {
        runtimeState.activeRenderState = previousRenderState;
        runtimeState.activeEventWrapper = previousEventWrapper;
        runtimeState.activeSetupComponentId = previousSetupId;
      }

      if (context.pending.size === 0) {
        break;
      }

      await Promise.all(context.pending);
    }

    return html;
  } finally {
    setSsrContext(null);
    setRpcRoutePath(null);
    setRpcRouteParams(null);
  }
}
