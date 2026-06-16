import { describe, expect, test } from 'vitest';
import { createSsrFetchAdapter } from '../../src/ssr';
import { h } from '../../src';
import type { RemoteFunction, ServerManifest } from '../../src/server/types';

describe('createSsrFetchAdapter', () => {
  test('renders HTML for page requests', async () => {
    function App() {
      return () => <main>Hello SSR</main>;
    }

    const handler = createSsrFetchAdapter({
      manifest: {},
      ssr: { app: h(App) },
    });

    const response = await handler(new Request('http://localhost/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('<main>Hello SSR</main>');
  });

  test('handles RPC requests before rendering', async () => {
    const remoteFn: RemoteFunction = {
      __auwla_remote: true,
      method: 'GET',
      middleware: [],
      handler: async () => ({ ok: true }),
    } as unknown as RemoteFunction;

    const manifest: ServerManifest = {
      'test.check': {
        modulePath: 'dummy',
        exportName: 'check',
        method: 'GET',
        routePattern: '',
        params: [],
        paramsType: '{}',
        argsType: [],
        returnType: 'object',
      },
    };

    function App() {
      return () => <main>App</main>;
    }

    const handler = createSsrFetchAdapter({
      manifest,
      load: async () => ({ check: remoteFn }),
      ssr: { app: h(App) },
    });

    const rpcUrl = new URL('http://localhost/_auwla/rpc');
    rpcUrl.searchParams.set('key', 'test.check');
    rpcUrl.searchParams.set('routePath', '/');
    const response = await handler(new Request(rpcUrl.toString()));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ ok: true });
  });
});
