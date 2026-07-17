/**
 * Regression tests for server-side issue-registry fixes — see ARCHITECTURE.md.
 */
import { describe, expect, test, afterEach } from 'vitest';
import { renderToString } from '../../src/runtime/ssr';
import { getCurrentRoutePath, getCurrentRouteParams } from '../../src/client/rpc';
import { getRouted } from '../../src/router';
import type { Route } from '../../src/router/types';

describe('B2 — concurrent SSR requests have isolated route context', () => {
  test('two interleaved renderToString calls never see each other\'s path/params', async () => {
    // A shared barrier forces both loaders to be in-flight at the same time:
    // request A sets its path, yields; request B sets its path, yields; only
    // then do both resume and read the route context.
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });

    const observed: Record<string, { path: string; params: Record<string, unknown> }> = {};

    function makePage(label: string) {
      const routed = async () => {
        await barrier;
        const path = getCurrentRoutePath();
        const params = getCurrentRouteParams();
        observed[label] = { path, params: { ...params } };
        return path;
      };
      function Page() {
        const data = getRouted(routed as any);
        return () => `<p>${(data as any)?.value ?? ''}</p>`;
      }
      return { routed, Page };
    }

    const a = makePage('a');
    const b = makePage('b');
    const routes: Route[] = [
      { path: '/posts/:id', component: a.Page, routed: a.routed } as Route,
    ];
    const routesB: Route[] = [
      { path: '/users/:name', component: b.Page, routed: b.routed } as Route,
    ];

    const promiseA = renderToString('http://localhost/posts/1', routes, { manifest: {} });
    const promiseB = renderToString('http://localhost/users/alice', routesB, { manifest: {} });

    // Let both requests reach their loader await, then release them together.
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    release();

    const [resultA, resultB] = await Promise.all([promiseA, promiseB]);

    // Without ALS isolation the module-level fallback would make both
    // requests read whichever path was written last.
    expect(observed.a.path).toBe('/posts/1');
    expect(observed.a.params).toEqual({ id: '1' });
    expect(observed.b.path).toBe('/users/alice');
    expect(observed.b.params).toEqual({ name: 'alice' });
    expect(resultA.html).toContain('/posts/1');
    expect(resultB.html).toContain('/users/alice');
  });
});

describe('S6 — defaultLoad resolves root-relative manifest paths', () => {
  afterEach(() => {
    delete (globalThis as any).__auwla_vite_server;
    delete (globalThis as any).__auwla_serverRoot;
  });

  test('resolves relative paths against the Vite root in dev', async () => {
    const { defaultLoad } = await import('../../src/server/utils');
    const seen: string[] = [];
    (globalThis as any).__auwla_vite_server = {
      config: { root: 'C:/proj/app' },
      ssrLoadModule: async (url: string) => {
        seen.push(url);
        return {};
      },
    };

    await defaultLoad('src/pages/about.server.ts');
    expect(seen).toEqual(['/@fs/C:/proj/app/src/pages/about.server.ts']);
  });

  test('absolute paths keep the legacy /@fs form in dev', async () => {
    const { defaultLoad } = await import('../../src/server/utils');
    const seen: string[] = [];
    (globalThis as any).__auwla_vite_server = {
      config: { root: '/proj/app' },
      ssrLoadModule: async (url: string) => {
        seen.push(url);
        return {};
      },
    };

    await defaultLoad('/proj/app/src/pages/about.server.ts');
    expect(seen).toEqual(['/@fs/proj/app/src/pages/about.server.ts']);
  });
});
