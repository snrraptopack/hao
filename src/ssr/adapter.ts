/**
 * @fileoverview SSR adapter integration.
 *
 * Composes the RPC fetch adapter with server-side rendering so a single
 * request handler can serve both HTML pages and JSON RPC endpoints.
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
   * Defaults to a minimal HTML5 document.
   */
  template?: (html: string) => string;
}

export interface SsrFetchAdapterOptions extends FetchAdapterOptions {
  ssr: SsrOptions;
}

function defaultTemplate(html: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
}

/**
 * Create a WinterCG-compatible fetch handler that serves RPC requests and
 * renders the app to HTML for everything else.
 */
export function createSsrFetchAdapter(options: SsrFetchAdapterOptions) {
  const rpcHandler = createFetchAdapter(options);
  const template = options.ssr.template ?? defaultTemplate;

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
