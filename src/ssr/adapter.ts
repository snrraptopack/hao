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

import { readFileSync } from 'node:fs';
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
   * When omitted, the adapter tries to read `<staticDir>/index.html` and
   * inject the rendered app into its `<div id="app"></div>`. If no static
   * directory is configured, a minimal development template is used.
   */
  template?: (html: string) => string;
  /**
   * Client entry URL injected into the fallback development template as a
   * module script. Ignored when a custom `template` is provided or when a
   * static `index.html` is used.
   *
   * @default '/src/main.tsx'
   */
  clientEntry?: string;
  /**
   * Directory to serve static files from before falling back to SSR.
   * When set and `Bun.file` is available, requests for existing files are
   * served directly. The directory is also used to discover the production
   * `index.html` template.
   *
   * In non-Bun environments static files should be served by the host
   * framework; this option is ignored when `Bun.file` is unavailable.
   *
   * @default null
   */
  staticDir?: string | null | false;
}

export interface SsrAdapterOptions extends FetchAdapterOptions {
  ssr: SsrOptions;
}

/** @deprecated Use {@link SsrAdapterOptions} instead. */
export type SsrFetchAdapterOptions = SsrAdapterOptions;

function devTemplate(clientEntry: string) {
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

function buildTemplate(options: SsrOptions): (html: string) => string {
  if (options.template) return options.template;

  const staticDir = options.staticDir;
  if (staticDir) {
    try {
      const indexHtml = readFileSync(`${staticDir}/index.html`, 'utf-8');
      return (html: string) =>
        indexHtml.replace(
          /<div\s+id=["']app["']\s*>\s*<\/\s*div>/i,
          `<div id="app">${html}</div>`,
        );
    } catch {
      // Fall through to the dev template.
    }
  }

  return devTemplate(options.clientEntry ?? '/src/main.tsx');
}

/**
 * Create a WinterCG-compatible fetch handler that serves RPC requests,
 * static files, and renders the app to HTML for everything else.
 */
export function createSsrAdapter(options: SsrAdapterOptions) {
  const rpcHandler = createFetchAdapter(options);
  const template = buildTemplate(options.ssr);
  const staticDir = options.ssr.staticDir ?? null;
  const bun = typeof (globalThis as any).Bun !== 'undefined' ? (globalThis as any).Bun : null;

  return async function handle(
    request: Request,
    platform?: unknown,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Static file serving for Bun. Other runtimes should serve static files
    // in front of this handler.
    if (bun && staticDir && url.pathname !== '/' && !url.pathname.startsWith('/_auwla/')) {
      const file = bun.file(`${staticDir}${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    const rpcResponse = await rpcHandler(request, platform as Record<string, unknown>);
    if (rpcResponse) {
      return rpcResponse;
    }

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
