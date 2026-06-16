/**
 * @fileoverview SSR adapter integration.
 *
 * Composes the RPC fetch adapter with server-side rendering so a single
 * request handler can serve both HTML pages and JSON RPC endpoints.
 *
 * This is the server-switchable SSR entry point: it returns a WinterCG-style
 * `fetch` handler that can be passed to Bun.serve(), Hono, Express, Node
 * `http.createServer`, or any other environment that accepts `Request` =>
 * `Response`.
 */

import { createFetchAdapter, type FetchAdapterOptions } from '../adapters/fetch';
import { renderToString, type RenderToStringOptions } from './render';
import type { RenderClosure } from '../runtime/types';

export interface SsrOptions {
  /**
   * Root render closure (the result of JSX like `<App />`) or any value
   * accepted by `renderToString`.
   */
  app: RenderClosure | (() => unknown) | unknown;
  /** Options forwarded to `renderToString`. */
  render?: Omit<RenderToStringOptions, 'request' | 'manifest' | 'load' | 'path'>;
  /**
   * Wrap the rendered app HTML in a full document template.
   * Defaults to a minimal HTML5 document that mounts the client entry.
   */
  template?: (html: string) => string;
  /**
   * Client entry URL injected into the default HTML template as a module
   * script. Ignored when a custom `template` is provided.
   *
   * @default '/src/main.tsx'
   */
  clientEntry?: string;
}

export interface SsrAdapterOptions extends FetchAdapterOptions {
  ssr: SsrOptions;
}

/** @deprecated Use {@link SsrAdapterOptions} instead. */
export type SsrFetchAdapterOptions = SsrAdapterOptions;

function defaultTemplate(clientEntry: string) {
  return (html: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<div id="app">${html}</div>
<script type="module" src="${clientEntry}"></script>
</body>
</html>`;
}

/**
 * Create a WinterCG-compatible fetch handler that serves RPC requests and
 * renders the app to HTML for everything else.
 */
export function createSsrAdapter(options: SsrAdapterOptions) {
  const rpcHandler = createFetchAdapter(options);
  const clientEntry = options.ssr.clientEntry ?? '/src/main.tsx';
  const template = options.ssr.template ?? defaultTemplate(clientEntry);

  return async function handle(
    request: Request,
    platform?: Record<string, unknown>,
  ): Promise<Response> {
    const rpcResponse = await rpcHandler(request, platform);
    if (rpcResponse) {
      return rpcResponse;
    }

    const url = new URL(request.url);
    const html = await renderToString(options.ssr.app, {
      request,
      manifest: options.manifest,
      load: options.load,
      path: url.pathname + url.search,
      ...options.ssr.render,
    });

    return new Response(template(html), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  };
}

/** @deprecated Use {@link createSsrAdapter} instead. */
export const createSsrFetchAdapter = createSsrAdapter;
